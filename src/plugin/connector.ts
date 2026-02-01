function checkIfNested(id = '') {
  return id.includes(';');
}

function getParentRecursive(node) {
  if (checkIfNested(node.id)) {
    return getParentRecursive(node?.parent);
  } else return node;
}

function calculatePosition(firstNode, secondNode) {
  const { x: firstX, y: firstY, width: firstWidth, height: firstHeight } = firstNode.absoluteBoundingBox;
  const { x: secondX /*y: secondY, width: secondWidth, height: secondHeight*/ } = secondNode.absoluteBoundingBox;

  const {
    id: parentNodeId,
    absoluteBoundingBox: { x: parentX, y: parentY },
  } = getParentRecursive(firstNode);

  const targetPositionX = firstX - parentX;
  const targetPositionY = firstY - parentY;

  if (firstX > secondX) {
    return {
      parentNodeId,
      endpointPosition: {
        x: targetPositionX,
        y: targetPositionY + firstHeight / 2,
      },
    };
  } else {
    return {
      parentNodeId,
      endpointPosition: {
        x: targetPositionX + firstWidth,
        y: targetPositionY + firstHeight / 2,
      },
    };
  }
}

function createConnectorEdge(nodes, position): ConnectorEndpoint {
  const positionIndex = position === 'end' ? 1 : 0;
  if (checkIfNested(nodes[positionIndex].id)) {
    const oppositePositionIndex = position === 'end' ? 0 : 1;

    const { parentNodeId, endpointPosition } = calculatePosition(nodes[positionIndex], nodes[oppositePositionIndex]);

    return {
      endpointNodeId: parentNodeId,
      position: endpointPosition,
    };
  } else {
    return {
      endpointNodeId: nodes[positionIndex].id,
      magnet: 'AUTO',
    };
  }
}

export const { getInitConnector, setInitConnector, checkInitConnector, reuseAnyConnector, createConnector } = (() => {
  async function getInitConnector(): Promise<ConnectorNode | null> {
    const connectorId = figma.root.getPluginData('initConnectorId');
    const connector = await figma.getNodeByIdAsync(connectorId);

    if (connector && connector.type === 'CONNECTOR' && !connector.removed) return connector;

    return null;
  }

  function setInitConnector(node: ConnectorNode) {
    figma.root.setPluginData('initConnectorId', node.id);
  }

  async function checkInitConnector() {
    const initConnector = await getInitConnector();
    return initConnector && !initConnector?.removed;
  }

  function reuseAnyConnector() {
    const allConnectors = figma.currentPage.findAllWithCriteria({
      types: ['CONNECTOR'],
    });
    const defaultConnector = allConnectors.find((connector) => connector.name === '_flow-init-connector');
    const initConnector = defaultConnector || allConnectors[0] || null;

    if (initConnector) {
      setInitConnector(initConnector);
    }
    return;
  }

  async function createConnector(nodes: readonly SceneNode[]) {
    const initConnector = await getInitConnector();

    if (!initConnector) {
      return false;
    }

    const initConnectorFrame = initConnector.parent as FrameNode;

    const newConnectorFrame = initConnectorFrame.clone();

    const newConnector = newConnectorFrame.findOne((node) => node.type === 'CONNECTOR') as ConnectorNode;

    if (newConnector.text.characters) {
      const connectorFont = newConnector.text.fontName as FontName;
      await figma.loadFontAsync(connectorFont);

      newConnector.text.characters = '';
    }

    newConnector.connectorStart = createConnectorEdge(nodes, 'start');
    newConnector.connectorEnd = createConnectorEdge(nodes, 'end');
    newConnector.connectorLineType = 'ELBOWED';
    newConnector.visible = true;
    newConnector.locked = false;
    newConnector.name = 'Flow Connector';
    newConnector.strokeWeight = 4;
    newConnector.strokes = [
      {
        type: 'SOLID',
        color: { r: 0.6, g: 0.6, b: 0.6 },
        opacity: 0.8,
      },
    ];
    newConnectorFrame.remove();
    figma.currentPage.selection = [newConnector];
    return true;
  }

  return {
    getInitConnector,
    setInitConnector,
    checkInitConnector,
    reuseAnyConnector,
    createConnector,
  };
})();
