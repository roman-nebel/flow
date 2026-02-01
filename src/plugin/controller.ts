import { createConnector, setInitConnector, checkInitConnector, reuseAnyConnector } from './connector';
import { getQueue, updateQueue } from './selectionQueue';
import { sendUIAction } from './UIController';
import connectorTemplate from './arrowString';

function initConnectorHandler() {
  const nodes = figma.currentPage.selection;

  if (nodes.length === 1 && nodes[0].type === 'CONNECTOR') {
    const arrow = nodes[0];
    figma.currentPage.selection = [];
    arrow.x = -131100;
    arrow.y = -131100;
    arrow.visible = false;
    arrow.locked = true;
    arrow.name = '_flow-init-connector';
    const frame = figma.createFrame();
    frame.name = '_flow-init-connector-frame';
    frame.resize(100, 100);
    frame.x = -131100;
    frame.y = -131100;
    frame.visible = false;
    frame.locked = true;
    frame.appendChild(arrow);
    figma.currentPage.insertChild(0, frame);
    setInitConnector(arrow);
    sendUIAction('SET_STANDBY');
  }
}

async function run() {
  try {
    figma.showUI(__html__, {
      width: 340,
      height: 320,
      visible: false,
    });
    const hasConnector = await checkInitConnector();
    if (!hasConnector) {
      const initNotification = figma.notify('Initialize the plugin...');
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            reuseAnyConnector();
            resolve('');
          } catch (e) {
            reject(e);
          }
        });
      });
      initNotification.cancel();
    }
    figma.ui.show();
  } catch (err) {
    console.error('Plugin crashed:', err);
    figma.notify('Plugin failed. Please email us: we@eduhund.com', { error: true, timeout: 5000 });
  }
}

figma.ui.onmessage = async (message) => {
  const { type } = message;
  let hasConnector;
  switch (type) {
    case 'FOCUS_ON_CANVAS':
      figma.currentPage.selection = [];
      figma.viewport.zoom = figma.viewport.zoom;
      break;
    case 'CREATE_CONNECTOR':
      hasConnector = await checkInitConnector();

      if (!hasConnector) {
        const initNotification = figma.notify(
          'It looks like the recently used connector was deleted. Trying to find another one...'
        );
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            try {
              reuseAnyConnector();
              resolve('');
            } catch (e) {
              reject(e);
            }
          });
        });
        initNotification.cancel();
      }
      await createConnector(getQueue());
      break;
    case 'UI_READY':
      hasConnector = await checkInitConnector();
      if (!hasConnector) {
        figma.once('selectionchange', initConnectorHandler);
        sendUIAction('GET_INIT_CONNECTOR', { connectorTemplate });
      }
      break;
  }
};

figma.on('selectionchange', () => {
  const nodes = figma.currentPage.selection;
  const selectionQueue = updateQueue(nodes);
  if (selectionQueue.length === 2 && selectionQueue[0].type !== 'CONNECTOR' && selectionQueue[1].type !== 'CONNECTOR') {
    figma.ui.postMessage({
      type: 'CONFIG_NODES',
    });
    return;
  }
  if (selectionQueue.length === 1 && selectionQueue[0].type === 'CONNECTOR') {
    figma.ui.postMessage({
      type: 'CONFIG_CONNECTOR',
    });
    return;
  }

  if (!checkInitConnector()) {
    return;
  }

  figma.ui.postMessage({
    type: 'SET_READY',
  });
});

run();
