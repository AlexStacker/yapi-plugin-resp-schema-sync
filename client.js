import RespSchemaSync from './component';
const GenerateSchema = require('generate-schema/src/schemas/json.js');
const { schemaValidator, json_parse } = require('common/utils.js');
import { handleSchemaRequired } from './utils';

const transformJsonToSchema = json => {
  json = json || {};
  let jsonData = json_parse(json);

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
      let res_body = run.interface.res_body;
      res_body = typeof res_body === 'string' ? json_parse(res_body) : res_body;

      let isComplex = false;
      // 复合schema时删除额外的属性
      if (res_body && (res_body['oneOf'] || res_body['anyOf'])) {
        isComplex = true;
        delete res_body['required'];
        delete res_body['properties'];
      }

      let validtor = schemaValidator(res_body, result.res.body);
      if (
        !res_body || // 原存储的为空值
        !validtor.valid || // 验证失败
        (!isComplex && res_body['properties'] && Object.keys(res_body['properties']).length === 0) // 仅仅有个properties没有验证信息
      ) {
        return {
          name: '同步数据',
          key: 'sync_' + idx++,
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

module.exports = function () {
  this.bindHook('after_request', run_after_request);
};
