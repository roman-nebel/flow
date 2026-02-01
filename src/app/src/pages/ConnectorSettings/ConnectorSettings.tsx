import React from 'react';
import { Form, Input, Typography } from 'antd';

const { Title, Text } = Typography;

export default function ConnectorSettings() {
  return (
    <>
      <Title level={2}>Edit connector</Title>
      <div className="main_content">
        <div>
          <Form.Item label="Connector name" name="connectorName">
            <Input placeholder="Now connector text is empty" onChange={() => {}} />
          </Form.Item>
        </div>
        <Text>Settings will be here soon</Text>
      </div>
    </>
  );
}
