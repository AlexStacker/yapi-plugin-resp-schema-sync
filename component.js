import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import axios from 'axios';
const { json_parse } = require('common/utils.js');

import {
  Row,
  Col,
  Button,
  Tooltip,
  Modal,
  message
} from 'antd';
import {
  saveImportData,
  fetchInterfaceData,
  updateInterfaceData,
  fetchInterfaceListMenu
} from 'client/reducer/modules/interface';
import AceEditor from 'client/components/AceEditor/AceEditor';

import './style.scss';

@connect(
  state => {
    return {
      curdata: state.inter.curdata
    };
  },
  {
    saveImportData,
    fetchInterfaceData,
    updateInterfaceData,
    fetchInterfaceListMenu
  }
)
export default class RespSchemaSync extends Component {
  static propTypes = {
    curdata: PropTypes.object, // 接口原有数据
    schema: PropTypes.string,
    message: PropTypes.string,
    saveImportData: PropTypes.func,
    fetchInterfaceData: PropTypes.func,
    updateInterfaceData: PropTypes.func,
    fetchInterfaceListMenu: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      visible: true
    };
  }

  // 取消离开编辑页面
  onCancel = () => {
    this.setState({
      visible: false
    });
  };

  onMergeHandler = async (state) => {

    let schema_save = {
      "$schema": "http://json-schema.org/draft-04/schema#"
    };

    let o_schema = json_parse(this.props.curdata.res_body || '{}');
    let n_schema = json_parse(this.props.schema || '{}');

    // 合并处理
    if (state) {
      // 只针对原type是object的做
      let key;
      let match = (key = 'oneOf') && o_schema['oneOf'] || (key = 'anyOf') && o_schema['anyOf'];
      match = match || (key = 'oneOf') && [];

      delete o_schema["$schema"];
      delete n_schema["$schema"];

      match.push(o_schema);
      match.push(n_schema);

      schema_save[key] = match;
    } else {
      schema_save = n_schema
    }

    let payload = {
      res_body_type: 'json',
      res_body_is_json_schema: true,
      res_body: JSON.stringify(schema_save)
    };

    let result = await axios.post('/api/interface/up', {
      id: this.props.curdata._id,
      ...payload
    });
    this.props.fetchInterfaceData(this.props.curdata._id);

    if (result.data.errcode === 0) {
      // 更新到store中
      this.props.updateInterfaceData(payload);
      message.success('保存成功');

      this.setState({
        visible: false
      });
    } else {
      message.error(result.data.errmsg);
    }
  }

  componentDidMount() {
    // 将上一步验证错误的消息展示一次
    this.props.message && message.warning(this.props.message);
  }

  render() {
    return (
      <Modal
        title="需要处理返回数据"
        width={880}
        visible={this.state.visible}
        onCancel={this.onCancel}
        footer={[
          <Tooltip key="replace" placement="topLeft" title="原类型有误, 替换掉.">
            <Button type="danger" onClick={this.onMergeHandler.bind(this, false)}>替换</Button>
          </Tooltip>,
          <Tooltip key="merge" placement="topLeft" title="另一种返回值场景, 合并一起.">
            <Button type="primary" onClick={this.onMergeHandler.bind(this, true)}>合并</Button>
          </Tooltip>,
          <Button key="cancel" onClick={this.onCancel}>取消</Button>
        ]}
      >
        <div className="response-schema-sync">
          <Row gutter={12}>
            <Col span={12}>
              <div className="response-schema-title">
                <h4>旧Schema</h4>
              </div>
              <AceEditor
                callback={editor => {
                  editor.renderer.setShowGutter(false);
                }}
                readOnly={true}
                className="pretty-schema-editor"
                data={this.props.curdata.res_body}
                mode="json"
              />
            </Col>
            <Col span={12}>
              <div className="response-schema-title">
                <h4>新Schema</h4>
              </div>
              <AceEditor
                callback={editor => {
                  editor.renderer.setShowGutter(false);
                }}
                readOnly={true}
                className="pretty-schema-editor"
                data={this.props.schema}
                mode="json"
              />
            </Col>
          </Row>
        </div>
      </Modal>
    );
  }
}