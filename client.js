import equal from 'fast-deep-equal';
const GenerateSchema = require('generate-schema/src/schemas/json.js');

import RespSchemaSync from './component';
import { /*isJson,*/ deepCopyJson, json5_parse } from 'client/common.js';
const { schemaValidator } = require('common/utils.js');
import { handleSchemaRequired } from './utils';

const transformJsonToSchema = json => {
  json = json || {};
  let jsonData = json5_parse(json);

  jsonData = GenerateSchema(jsonData);

  // 返回值都作为必选值
  handleSchemaRequired(jsonData, true);

  let schemaData = JSON.stringify(jsonData);

  return schemaData;
};

let idx = 0;
function run_after_request(result, run) {
  if (result.res.status === 200) {
    // 原始值为空或者返回结构和schema和原来的不一致
    if (result.res.body) {
      let resp_res_body = deepCopyJson(result.res.body);
      let inter_res_body = run.interface.res_body;

      // 返回值是JSON才处理
      let contentType = result.res.header['Content-Type'] || result.res.header['content-type'];
      if (contentType && contentType.indexOf('application/json') > -1) {
        inter_res_body = typeof inter_res_body === 'string' ? json5_parse(inter_res_body) : inter_res_body;

        // let isComplex = false;
        // 复合schema时删除额外的属性
        if (inter_res_body && (inter_res_body['oneOf'] || inter_res_body['anyOf'])) {
          // isComplex = true;
          delete inter_res_body['required'];
          delete inter_res_body['properties'];
        }

        let validtor = schemaValidator(inter_res_body, resp_res_body, {
          removeAdditional: 'failing'
        });

        if (
          !inter_res_body || // 原存储的为空值
          !validtor.valid || // 验证失败
          !equal(result.res.body, resp_res_body)
        ) {
          return {
            name: '同步数据',
            key: 'resp_schema_sync_' + idx++,
            component: RespSchemaSync,
            injectData: {
              message: validtor.message,
              schema: transformJsonToSchema(result.res.body)
            }
          };
        }
      }  
    }
  }
}

module.exports = function () {
  this.bindHook('after_request', run_after_request);
};
