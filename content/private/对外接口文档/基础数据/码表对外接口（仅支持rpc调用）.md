---
publish: true
---
码表关联导入模版的excel解锁密码@cic12345

[https://cic_irc.yuque.com/tyl581/ggwv9w/vruo83cus2wzkord](https://cic_irc.yuque.com/tyl581/ggwv9w/vruo83cus2wzkord)

# pom坐标

```
<dependency>
    <groupId>com.aliyun.fsi.insurance</groupId>
    <artifactId>aboss-code-client</artifactId>
    <version>1.4.1-RELEASE</version>
</dependency>
```

# 一、码表相关接口

码表

基础代码类型表 t_abs_basic_type

基础代码表 t_abs_basic_code

## 1.1查询码表类型列表(typeCodes、typeName和typeFrom不能同时为空)

URL: `services.queryTypes`

/platform/api/aboss/basic-code/front/query-types

Type: `POST`

Author: zhanghua

Content-Type: `application/json; charset=utf-8`

Description: com.aliyun.fsi.insurance.dict.api.CodeRPCFacade.queryTypes(BasicTypeQrybasicTypeQry)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|typeCodes|string[]|类型代码|false|-|
|typeName|string|类型名称|false|-|
|typeFrom|string|typeFrom 归属域|false|-|
|status|int8|状态(为空返回所有有效数据，1:启用，0:停用) status如果不传，那么status=0和status=1的数据都会返回|false|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryTypes({
  typeCodes: ["ycvkro"],
  typeName: "granville.quigley",
  typeFrom: "saz2af",
  status: 16
});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|typeCode|string|类型代码|-|
|typeName|string|类型名称|-|
|typeFrom|string|来源（域来源）|-|
|status|int8|启用停用(1:启用，0:停用)|-|

#### 返回参数示例：

```
[
  {
    "typeCode": "48435",
    "typeName": "granville.quigley",
    "typeFrom": "glqida",
    "status": 104
  }
]
```

## 1.2根据type查询码值列表

URL: `services.queryCodesByType`

/platform/api/aboss/basic-code/front/query-codes-by-type

Type:POST

Author: zhanghua

Content-Type:application/json; charset=utf-8

Description: com.aliyun.fsi.insurance.dict.api.CodeRPCFacade.queryByType(BasicCodeByTypeQrybasicCodeByTypeQry)1.根据 typeCode查询2.根据 typeCode和码值名模糊查询3.根据 typeCode和码值列表查询

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|typeCode|string|代码类型|true|-|
|basicValue|string|码值名称|false|-|
|codes|string[]|码值集合|false|-|
|status|int8|状态(为空返回所有有效数据,1:启用，0:停用) ，status如果不传，那么status=0和status=1的数据都会返回|false|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryCodesByType({
  typeCode: "63636",
  basicValue: "594jd9",
  codes: [ "oo5wip"],
  status: 37
});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|typeCode|string|类型代码|-|
|basicCode|string|基础代码编码|-|
|basicValue|string|基础代码值|-|
|parentCode|string|父级组件编码|-|
|status|int8|启用停用(1:启用，0:停用)|-|

#### 返回参数示例：

```
[
  {
    "typeCode": "63636",
    "basicCode": "63636",
    "basicValue": "36wff5",
    "parentCode": "63636",
    "status": 11
  }
]
```

## 1.3根据多个 type+code 的码值列表查询集合

URL: `services.queryCodesBatch`

/platform/api/aboss/basic-code/front/query-codes-batch

Type:POST

Author: zhanghua

Content-Type:application/json; charset=utf-8

Description: com.aliyun.fsi.insurance.dict.api.CodeRPCFacade.queryBatch(List< BasicTypeAndCodeQry > basicTypeAndCodeQries)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|typeCode|string|代码类型|true|-|
|code|string|代码code|true|-|
|status|int8|状态(为空返回所有有效数据,1:启用，0:停用)，status如果不传，那么status=0和status=1的数据都会返回|false|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryCodesBatch([
  {
    "typeCode": "63636",
    "code": "63636",
    "status": 70
  }
]);
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|typeCode|string|类型代码|-|
|basicCode|string|基础代码编码|-|
|basicValue|string|基础代码值|-|
|parentCode|string|父级组件编码|-|
|status|int8|启用停用(1:启用，0:停用)|-|

#### 返回参数示例：

```
[
  {
    "typeCode": "63636",
    "basicCode": "63636",
    "basicValue": "2cr499",
    "parentCode": "63636",
    "status": 44
  }
]
```

## 1.4根据type+父code查询码值列表

URL: `services.queryCodesByParentCode`

/platform/api/aboss/basic-code/front/query-codes-by-parent-code

Type: `POST`

Author: zhanghua

Content-Type: `application/json; charset=utf-8`

Description: com.aliyun.fsi.insurance.dict.api.CodeRPCFacade.queryByParentCode(BasicCodesByParentCodeQrybasicCodesByParentCodeQry)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|typeCode|string|代码类型|true|-|
|parenCode|string|父编码（待废弃）|false|-|
|parentCode|string|父编码|false|-|
|status|int8|状态(为空返回所有有效数据,1:启用，0:停用)，status如果不传，那么status=0和status=1的数据都会返回|false|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryCodesByParentCode({
  typeCode: "48435",
  parenCode: "48435",
  parentCode: "48435",
  status: 103
});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|typeCode|string|类型代码|-|
|basicCode|string|基础代码编码|-|
|basicValue|string|基础代码值|-|
|parentCode|string|父级组件编码|-|
|status|int8|启用停用(1:启用，0:停用)|-|

#### 返回参数示例：

```
[
  {
    "typeCode": "48435",
    "basicCode": "48435",
    "basicValue": "17vzbi",
    "parentCode": "48435",
    "status": 18
  }
]
```

## 1.5根据多个type查询码值列表

URL: `services.queryCodesByTypes`

/platform/api/aboss/basic-code/front/query-codes-by-types

Type:POST

Author: zhanghua

Content-Type:application/json; charset=utf-8

Description: com.aliyun.fsi.insurance.dict.api.CodeRPCFacade.queryByTypes(BasicCodeByTypesQrybasicCodeByTypesQry)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|typeCodes|array|代码类型集合|false|-|
|status|int8|状态(为空返回所有有效数据,1:启用，0:停用)，status如果不传，那么status=0和status=1的数据都会返回|false|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryCodesByTypes({
  typeCodes: ["rxk273"],
  status: 0
});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|typeCode|string|类型代码|-|
|basicCode|string|基础代码编码|-|
|basicValue|string|基础代码值|-|
|parentCode|string|父级组件编码|-|
|status|int8|启用停用(1:启用，0:停用)|-|

#### 返回参数示例：

```
{
  "mapKey": [
    {
      "typeCode": "85212",
      "basicCode": "85212",
      "basicValue": "r4iyrn",
      "parentCode": "85212",
      "status": 49
    }
  ]
}
```

## 1.6根据keyword（支持模糊）分页查询指定码表中的码值列表

URL: `services.queryCodesByTypeWithKeyword`

/platform/api/aboss/basic-code/front/query-codes-by-type-with-keyword

Type: `POST`

Author: zhanghua

Content-Type: `application/json; charset=utf-8`

Description: com.aliyun.fsi.insurance.dict.api.CodeRPCFacade.queryCodesByTypeWithKeyword(BasicCodeByTypeKeywordQry basicCodeByTypeKeywordQry)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|pageSize|int32|每页展示条数|true|-|
|pageIndex|int32|当前页码|true|-|
|typeCode|string|代码类型|true|-|
|keyword|string|码值basicCode或者basicValue|false|-|
|status|int8|状态(为空返回所有有效数据,1:启用，0:停用)，status如果不传，那么status=0和status=1的数据都会返回|false|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryCodesByTypeWithKeyword({
  pageSize: 10,
  pageIndex: 1,
  typeCode: "48435",
  keyword: "nvhlcy",
  status: 108
});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|typeCode|string|类型代码|-|
|basicCode|string|基础代码编码|-|
|basicValue|string|基础代码值|-|
|parentCode|string|父级组件编码|-|
|status|int8|启用停用(1:启用，0:停用)|-|

#### 返回参数示例：

```
[
  {
    "typeCode": "48435",
    "basicCode": "48435",
    "basicValue": "17ic79",
    "parentCode": "48435",
    "status": 1
  }
]
```

## 1.7根据keyword（支持模糊）分页查询码表列表

URL: `services.queryTypesWithKeyword`

/platform/api/aboss/basic-code/front/query-types-with-keyword

Type: `POST`

Author: zhanghua

Content-Type: `application/json; charset=utf-8`

Description: com.aliyun.fsi.insurance.dict.api.CodeRPCFacade.queryTypesWithKeyword(BasicTypeByKeywordQry basicTypeByKeywordQry)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|pageSize|int32|每页展示条数|true|-|
|pageIndex|int32|当前页码|true|-|
|keyword|string|typeCode(支持模糊)或者typeName(支持模糊)|false|-|
|typeFrom|string|typeFrom 归属域|false|-|
|status|int8|状态(为空返回所有有效数据,1:启用，0:停用)，status如果不传，那么status=0和status=1的数据都会返回|false|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryTypesWithKeyword({
  pageSize: 10,
  pageIndex: 1,
  keyword: "n5h9dx",
  typeFrom: "ml4ms9",
  status: 101
});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|typeCode|string|类型代码|-|
|typeName|string|类型名称|-|
|typeFrom|string|来源（域来源）|-|
|status|int8|启用停用(1:启用，0:停用)|-|

#### 返回参数示例：

```
[
  {
    "typeCode": "48435",
    "typeName": "granville.quigley",
    "typeFrom": "vrmwu1",
    "status": 65
  }
]
```

## 1.8根据码表和码值查询所有上级

URL: `/platform/api/aboss/basic-code/front/query-path`

/platform/api/aboss/basic-code/front/query-path

Type: `POST`

Author: zhanghua

Content-Type: `application/json; charset=utf-8`

Description: com.aliyun.fsi.insurance.dict.api.CodeRPCFacade.queryPath(BasicTypeAndCodeQrybasicTypeAndCodeQry)入参 area_cd + 110115 返回 ["110000","110100","110115"]

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|typeCode|string|代码类型|true|-|
|code|string|代码code|true|-|

#### 请求示例:

```
curl -X POST -H 'Content-Type: application/json; charset=utf-8' -i /platform/api/aboss/basic-code/front/query-path --data '{
  "typeCode": "area_cd",
  "code": "110115",
}'
```

#### 返回参数示例:

```
[
  "110000",
  "110100",
  "110115"
]
```

# 二、关联码相关接口

关联码

关联关系 t_abs_relationship

## 2.1 根据关联编码查询所有的关联关系集合

URL: `services.queryAllRelationship`

/platform/api/aboss/basic-code/front/query-all-relationship

Type: POST

Author: zhanghua

Content-Type: application/json; charset=utf-8

Description:com.aliyun.fsi.insurance.dict.api.RelationshipRPCFacade.queryAllRelationship(RelationshipQryrelationshipQry)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|associationCode|string|关联编码|true|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryAllRelationship({associationCode: "85212"});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|associationCode|string|码表关联编码|-|
|associationName|string|名称|-|
|associationFrom|string|归属(枚举值)|-|
|associationTypes|array|码表类型|-|
|relationshipDTOList|array|关联关系集合|-|
|└─id|string|ID|-|
|└─associationCode|string|关联编码|-|
|└─relationshipList|array|码表类型集合|-|
|└─typeCode|string|代码类型|-|
|└─codes|array|编码集合|-|
|└─codeValues|array|码值code-码值name||

#### 返回参数示例：

```
{
    "associationCode": "test_code",
    "associationName": "test",
    "associationFrom": "M010008",
    "associationTypes": [
        "imagpie_flow_metaservice_type_cd",
        "imagpie_flower_service_field_cd"
    ],
    "relationshipDTOList": [
        {
            "id": "7002949945079869440",
            "associationCode": "test_code",
            "relationshipList": [
                {
                    "typeCode": "imagpie_flow_metaservice_type_cd",
                    "codes": [
                        "methodName",
                        "facadeName",
                        "invokeName"
                    ],
                    "codeValues": {
                        "invokeName": "调用方法",
                        "methodName": "方法名称",
                        "facadeName": "接口名称"
                    }
                },
                {
                    "typeCode": "imagpie_flower_service_field_cd",
                    "codes": [
                        "local",
                        "http",
                        "sofa"
                    ],
                    "codeValues": {
                        "sofa": "RPC服务",
                        "http": "HTTP服务",
                        "local": "本地服务"
                    }
                }
            ]
        }
    ]
}
```

## 2.2 根据关联编码集合批量查询所有的关联关系集合

URL: `services.queryBatchRelationship`

/platform/api/aboss/basic-code/front/query-batch-relationship

Type: POST

Author: zhanghua

Content-Type: application/json; charset=utf-8

Description:com.aliyun.fsi.insurance.dict.api.RelationshipRPCFacade.queryBatchRelationship(List<RelationshipQry> relationshipQries)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|associationCode|string|关联编码|true|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryBatchRelationship({associationCode: "85212"});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|associationCode|string|码表关联编码|-|
|associationName|string|名称|-|
|associationFrom|string|归属(枚举值)|-|
|associationTypes|array|码表类型|-|
|relationshipDTOList|array|关联关系集合|-|
|└─id|string|ID|-|
|└─associationCode|string|关联编码|-|
|└─relationshipList|array|码表类型集合|-|
|└─typeCode|string|代码类型|-|
|└─codes|array|编码集合|-|
|└─codeValues|array|码值code-码值name||

#### 返回参数示例：

```
[
    {
        "associationCode": "test_code",
        "associationName": "test",
        "associationFrom": "M010008",
        "associationTypes": [
            "imagpie_flow_metaservice_type_cd",
            "imagpie_flower_service_field_cd"
        ],
        "relationshipDTOList": [
            {
                "id": "7002949945079869440",
                "associationCode": "test_code",
                "relationshipList": [
                    {
                        "typeCode": "imagpie_flow_metaservice_type_cd",
                        "codes": [
                            "methodName",
                            "facadeName",
                            "invokeName"
                        ],
                        "codeValues": {
                            "invokeName": "调用方法",
                            "methodName": "方法名称",
                            "facadeName": "接口名称"
                        }
                    },
                    {
                        "typeCode": "imagpie_flower_service_field_cd",
                        "codes": [
                            "local",
                            "http",
                            "sofa"
                        ],
                        "codeValues": {
                            "sofa": "RPC服务",
                            "http": "HTTP服务",
                            "local": "本地服务"
                        }
                    }
                ]
            }
        ]
    }
]
```

## 2.3 校验关联关系是否存在

URL: `services.checkRelationship`

/platform/api/aboss/basic-code/front/check-relationship

Type: POST

Author: zhanghua

Content-Type: application/json; charset=utf-8

Description:com.aliyun.fsi.insurance.dict.api.RelationshipRPCFacade.checkRelationship(CheckRelationshipcheckRelationship)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|associationCode|string|码表关联编码|true|-|
|values|array|码值键值对集合|false|-|
|└─typeCode|string|代码类型|true|-|
|└─codes|string[]|编码集合|true|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.checkRelationship({
  associationCode: "85212",
  values: [{ "typeCode": "85212", "codes": ["nrzh8h"] }]
});
```

#### 返回参数示例：

true

# 三、行政区相关接口

行政区

行政区表 t_abs_basic_area

## 3.1 查询行政区码表集合

URL: `services.queryAreas`

/platform/api/aboss/basic-code/front/query-areas

Type: POST

Author: zhanghua

Content-Type: application/json; charset=utf-8

Description:com.aliyun.fsi.insurance.dict.api.AreaCodeRPCFacade.queryAreas(AreaCodeQry areaCodeQry)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|code|string|地区编码(支持模糊查询)|false|-|
|name|string|地区编码名(支持模糊查询)|false|-|
|postCode|string|邮编|false|-|
|areaNumber|string|区号|false|-|
|proReferred|string|省份简称|false|-|
|parentCode|string|父编码|false|-|
|level|int8|省市区层级（1，2，3）|false|-|
|status|int8|状态(为空返回所有有效数据,1:启用，0:停用) ，status如果不传，那么status=0和status=1的数据都会返回|false||

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryAreas({
  code: "85212",
  name: "mattie.torp",
  postCode: "85212",
  areaNumber: "hjgqut",
  proReferred: "i8r03p",
  parentCode: "85212",
  level: 47
});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|id|string|ID|-|
|code|string|编码|-|
|name|string|编码名|-|
|provinceName|string|省份名|-|
|cityName|string|市区名|-|
|areaName|string|地区名|-|
|parentCode|string|父级编码|-|
|level|int8|省市区层级|-|
|postCode|string|邮编|-|
|areaNumber|string|电话区号|-|
|proReferred|string|省份简称|-|
|isValid|int8|是否有效|-|
|status|int8|启用停用(1:启用，0:停用)||
|gmtModified|string|更新时间|-|

#### 返回参数示例：

```
[
  {
    "id": "17",
    "code": "85212",
    "name": "mattie.torp",
    "provinceName": "mattie.torp",
    "cityName": "mattie.torp",
    "areaName": "mattie.torp",
    "parentCode": "85212",
    "level": 37,
    "postCode": "85212",
    "areaNumber": "k5wvyq",
    "proReferred": "bujtli",
    "isValid": 99,
    "gmtModified": "2022-11-18 15:13:03",
    "status": 1
  }
]
```

## 3.2 根据code集合查询所有的行政区码表集合

URL: `services.queryAreasByCodes`

/platform/api/aboss/basic-code/front/query-areas-by-codes

Type: POST

Author: zhanghua

Content-Type: application/json; charset=utf-8

Description:com.aliyun.fsi.insurance.dict.api.AreaCodeRPCFacade.queryAreasByCodes(AreaCodesQryareaCodesQry)

#### 请求参数:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|codes|array|地区编码集合|true|-|

#### 请求示例:

```
import { services } from '@cic/mp-support';

services.queryAreasByCodes({codes: [ "77vxod"]});
```

#### 返回参数说明：

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|id|string|ID|-|
|code|string|编码|-|
|name|string|编码名|-|
|provinceName|string|省份名|-|
|cityName|string|市区名|-|
|areaName|string|地区名|-|
|parentCode|string|父级编码|-|
|level|int8|省市区层级|-|
|postCode|string|邮编|-|
|areaNumber|string|电话区号|-|
|proReferred|string|省份简称|-|
|isValid|int8|是否有效|-|
|status|int8|启用停用(1:启用，0:停用)||
|gmtModified|string|更新时间|-|

#### 返回参数示例：

```
[
  {
    "id": "17",
    "code": "85212",
    "name": "mattie.torp",
    "provinceName": "mattie.torp",
    "cityName": "mattie.torp",
    "areaName": "mattie.torp",
    "parentCode": "85212",
    "level": 45,
    "postCode": "85212",
    "areaNumber": "l41ecc",
    "proReferred": "bb5fn8",
    "isValid": 81,
    "gmtModified": "2022-11-18 15:13:03",
    "status": 1
  }
]
```

  

## 3.3根据关联编码查询关联码表（返回码表详情）

URL:`/platform/api/aboss/basic-code/front/query-relation-ship-detail`

Type:`POST`

Author: zhanghua

Content-Type:`application/json; charset=utf-8`

Description: com.aliyun.fsi.insurance.dict.api.RelationshipRPCFacade#queryRelationshipDetail(com.aliyun.fsi.insurance.dict.dto.request.association.query.RelationshipQry)

Body-parameters:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|associationCode|string|关联编码|true|-|

Request-example:

```
curl -X POST -H 'Content-Type: application/json; charset=utf-8' -i /platform/api/aboss/basic-code/front/query-relation-ship-detail --data '{
  "associationCode": "46667"
}'
```

Response-fields:

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|associationCode|string|码表关联编码|-|
|associationName|string|名称|-|
|associationFrom|string|归属(枚举值)|-|
|associationTypes|array|码表类型|-|
|associationRelationDetailSubDTOList|array|关联关系集合|-|
|└─relationshipDetailList|array|关联关系集合|-|
|└─typeCode|string|码表关联编码|-|
|└─basicCodeList|array|关联关系集合|-|
|└─typeCode|string|码表类型代码|-|
|└─typeName|string|码表类型名称|-|
|└─basicCode|string|基础代码编码|-|
|└─basicValue|string|基础代码值|-|
|└─parentCode|string|父级组件编码|-|
|└─isValid|int8|有效无效标识(1:有效，0:无效)|-|
|└─status|int8|启用停用标识(1:启用，0:停用)|-|

Response-example:

```
{
  "associationCode": "46667",
  "associationName": "laura.hartmann",
  "associationFrom": "x6szuw",
  "associationTypes": [
    "np7ovc"
  ],
  "associationRelationDetailSubDTOList": [
    {
      "relationshipDetailList": [
        {
          "typeCode": "46667",
          "basicCodeList": [
            {
              "typeCode": "46667",
              "typeName": "laura.hartmann",
              "basicCode": "46667",
              "basicValue": "2kdh23",
              "parentCode": "46667",
              "isValid": 46,
              "status": 57
            }
          ]
        }
      ]
    }
  ]
}
```

## 3.4根据批量关联编码查询关联码表（返回码表详情）

URL:`/platform/api/aboss/basic-code/front/query-batch-relation-ship-detail`

Type:`POST`

Author: zhanghua

Content-Type:`application/json; charset=utf-8`

Description: com.aliyun.fsi.insurance.dict.api.RelationshipRPCFacade#queryBatchRelationshipDetail(java.util.List<com.aliyun.fsi.insurance.dict.dto.request.association.query.RelationshipQry>)

Body-parameters:

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|associationCode|string|关联编码|true|-|

Request-example:

```
curl -X POST -H 'Content-Type: application/json; charset=utf-8' -i /platform/api/aboss/basic-code/front/query-batch-relation-ship-detail --data '[
  {
    "associationCode": "46667"
  }
]'
```

Response-fields:

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|associationCode|string|码表关联编码|-|
|associationName|string|名称|-|
|associationFrom|string|归属(枚举值)|-|
|associationTypes|array|码表类型|-|
|associationRelationDetailSubDTOList|array|关联关系集合|-|
|└─relationshipDetailList|array|关联关系集合|-|
|└─typeCode|string|码表关联编码|-|
|└─basicCodeList|array|关联关系集合|-|
|└─typeCode|string|码表类型代码|-|
|└─typeName|string|码表类型名称|-|
|└─basicCode|string|基础代码编码|-|
|└─basicValue|string|基础代码值|-|
|└─parentCode|string|父级组件编码|-|
|└─isValid|int8|有效无效标识(1:有效，0:无效)|-|
|└─status|int8|启用停用标识(1:启用，0:停用)|-|

Response-example:

```
[
  {
    "associationCode": "46667",
    "associationName": "laura.hartmann",
    "associationFrom": "d5npo4",
    "associationTypes": [
      "rvjr2y"
    ],
    "associationRelationDetailSubDTOList": [
      {
        "relationshipDetailList": [
          {
            "typeCode": "46667",
            "basicCodeList": [
              {
                "typeCode": "46667",
                "typeName": "laura.hartmann",
                "basicCode": "46667",
                "basicValue": "qw2llq",
                "parentCode": "46667",
                "isValid": 123,
                "status": 34
              }
            ]
          }
        ]
      }
    ]
  }
]
```

# 四、新老接口迁移对比

|   |   |   |
|---|---|---|
|老接口|新接口|备注|
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#queryCodeInTag|com.aliyun.fsi.insurance.dict.api.RelationshipRPCFacade#queryAllRelationship|根据标签查询对应的码表集合等同于关联码只配置一个码表的情况|
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#queryCodeByTypesAndTags|com.aliyun.fsi.insurance.dict.api.RelationshipRPCFacade#queryAllRelationship||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectByCode|com.aliyun.fsi.insurance.dict.api.CodeRPCFacade#queryBatch||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectByParentCode|com.aliyun.fsi.insurance.dict.api.CodeRPCFacade#queryByParentCode||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectByType|com.aliyun.fsi.insurance.dict.api.CodeRPCFacade#queryByTypes||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectTreeStruct||废弃|
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectParentTreeStruct||废弃|
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectByCodeList|com.aliyun.fsi.insurance.dict.api.CodeRPCFacade#queryByType||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectByCodesAndType|com.aliyun.fsi.insurance.dict.api.CodeRPCFacade#queryByType||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectRelationListByType|com.aliyun.fsi.insurance.dict.api.RelationshipRPCFacade#queryAllRelationship||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#checkCode|com.aliyun.fsi.insurance.dict.api.CodeRPCFacade#queryBatch||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#checkCodes|com.aliyun.fsi.insurance.dict.api.CodeRPCFacade#queryBatch||
|com.aliyun.fsi.insurance.code.facade.BasicCodeFacade#selectAllCodeInType|com.aliyun.fsi.insurance.dict.api.CodeRPCFacade#queryByType||