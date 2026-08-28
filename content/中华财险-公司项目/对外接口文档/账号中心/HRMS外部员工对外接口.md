---
publish: true
---

https://cic_irc.yuque.com/tyl581/ggwv9w/iempvt2gduzi4khk
### pom依赖

```
<dependency>
    <groupId>com.aliyun.fsi.insurance</groupId>
    <artifactId>aboss-property-hrms-facade</artifactId>
    <version>1.0.3-SNAPSHOT</version>
</dependency>
```

### 1. 查询外部员工详情

**URL:** /platform/api/aboss/hrms/staff/rpc/query-staff-detail

**Type:** GET

**Author:** zhanghua

**Content-Type:** application/json; charset=utf-8

**Description:** com.aliyunfsi.insurance.hrms.facade.staff.OutsourcedStaffFacade#queryStaffDetail(com.aliyunfsi.insurance.hrms.facade.dto.req.OutStaffIdQry)

**Body-parameters:**

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|accountId|string|账户id|true|-|

**Request-example:**

```
curl -X GET -H 'Content-Type: application/json; charset=utf-8' -i /platform/api/aboss/hrms/staff/rpc/query-staff-detail --data '{
  "accountId": "184"
}'
```

**Response-fields:**

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|staffId|string|员工id|-|
|accountId|string|账号|-|
|displayName|string|显示名称|-|
|phone|string|手机号|-|
|branchOrgCode|string|归属组织编码|-|
|branchOrgName|string|归属组织名称|-|
|operatingOrgCode|string|归属经营组织编码|-|
|operatingOrgName|string|归属经营组织名称|-|
|agreementNo|string|关联协议ID|-|
|agreementName|string|协议名称|-|
|businessLineCode|string|业务线|-|
|businessLineName|string|业务线名称|-|
|workPositionCode|string|工作岗位|-|
|workPositionName|string|工作岗位名称|-|
|standardPositionCode|string|标准岗位|-|
|standardPositionName|string|标准岗位名称|-|
|supplierId|string|供应商|-|
|supplierName|string|供应商名称|-|
|staffStatus|string|在职状态(-3入场审批中,-2审批通过待入场,-1未入场,0已入场,1已离场,2离场审批中,3审批通过待离场)|-|
|certificateType|string|证件类型|-|
|certificateNumber|string|证件号码|-|
|gender|string|性别|-|
|birthDate|string|出生日期|-|
|education|string|最高学历|-|
|politicalStatus|string|政治面貌|-|
|projectCode|string|项目id|-|
|projectName|string|项目名称|-|
|agreementBranchOrgCode|string|协议归属组织编码|-|
|agreementBranchOrgName|string|协议归属组织名称|-|
|onboardDate|string|入场日期|-|
|offboardDate|string|离场日期|-|
|autoAuthorize|int32|是否自动授权|-|
|businessCategory|string|业务分类|-|
|age|int32|年龄|-|
|ethnic|string|民族|-|
|household|string|户口类型|-|
|workStartDate|string|开始工作时间|-|
|email|string|邮箱|-|
|highestEducation|string|最高学历学制|-|
|major|string|所学专业|-|
|highestDegree|string|最高学位|-|
|mailingAddress|string|通讯地址|-|
|picture|string|照片|-|
|workLocation|string|工作所在地|-|
|workLocationName|string|工作所在地名称|-|
|employmentCategory|string|用工类型|-|
|regionName|string|区域名称|-|

**Response-example:**

```
{
  "staffId": "184",
  "accountId": "184",
  "displayName": "reynaldo.beahan",
  "phone": "1-320-206-5035",
  "branchOrgCode": "8865",
  "branchOrgName": "reynaldo.beahan",
  "operatingOrgCode": "8865",
  "operatingOrgName": "reynaldo.beahan",
  "agreementNo": "mib4tv",
  "agreementName": "reynaldo.beahan",
  "businessLineCode": "8865",
  "businessLineName": "reynaldo.beahan",
  "workPositionCode": "8865",
  "workPositionName": "reynaldo.beahan",
  "standardPositionCode": "8865",
  "standardPositionName": "reynaldo.beahan",
  "supplierId": "184",
  "supplierName": "reynaldo.beahan",
  "staffStatus": "98cb1m",
  "certificateType": "s8v7ox",
  "certificateNumber": "sx9d0i",
  "gender": "1e0gzk",
  "birthDate": "2025-11-13",
  "education": "kvjpjd",
  "politicalStatus": "wcm626",
  "projectCode": "8865",
  "projectName": "reynaldo.beahan",
  "agreementBranchOrgCode": "8865",
  "agreementBranchOrgName": "reynaldo.beahan",
  "onboardDate": "2025-11-13",
  "offboardDate": "2025-11-13",
  "autoAuthorize": 411,
  "businessCategory": "n5e6a6",
  "age": 5,
  "ethnic": "mg40jz",
  "household": "kw0vk2",
  "workStartDate": "2025-11-13",
  "email": "kathline.donnelly@yahoo.com",
  "highestEducation": "irp795",
  "major": "gx4gnm",
  "highestDegree": "1pg9y6",
  "mailingAddress": "Apt. 858 4464 Luanna Stravenue， New Lessie， IL 74374-0921",
  "picture": "kt6gxc",
  "workLocation": "55udgk",
  "workLocationName": "reynaldo.beahan",
  "employmentCategory": "vkyh9z",
  "regionName": "reynaldo.beahan"
}
```

### 2. 批量查询外部员工详情

**URL:** /platform/api/aboss/hrms/staff/rpc/query-staff-list

**Type:** GET

**Author:** zhanghua

**Content-Type:** application/json; charset=utf-8

**Description:** com.aliyunfsi.insurance.hrms.facade.staff.OutsourcedStaffFacade#queryStaffList(com.aliyunfsi.insurance.hrms.facade.dto.req.OutStaffIdsQry)

**Body-parameters:**

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|accountIds|array|账户id集合（最多100条）|true|-|

**Request-example:**

```
curl -X GET -H 'Content-Type: application/json; charset=utf-8' -i /platform/api/aboss/hrms/staff/rpc/query-staff-list --data '{
  "accountIds": [
    "718y4l"
  ]
}'
```

**Response-fields:**

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|staffId|string|员工id|-|
|accountId|string|账号|-|
|displayName|string|显示名称|-|
|phone|string|手机号|-|
|branchOrgCode|string|归属组织编码|-|
|branchOrgName|string|归属组织名称|-|
|operatingOrgCode|string|归属经营组织编码|-|
|operatingOrgName|string|归属经营组织名称|-|
|agreementNo|string|关联协议ID|-|
|agreementName|string|协议名称|-|
|businessLineCode|string|业务线|-|
|businessLineName|string|业务线名称|-|
|workPositionCode|string|工作岗位|-|
|workPositionName|string|工作岗位名称|-|
|standardPositionCode|string|标准岗位|-|
|standardPositionName|string|标准岗位名称|-|
|supplierId|string|供应商|-|
|supplierName|string|供应商名称|-|
|staffStatus|string|在职状态(-3入场审批中,-2审批通过待入场,-1未入场,0已入场,1已离场,2离场审批中,3审批通过待离场)|-|
|certificateType|string|证件类型|-|
|certificateNumber|string|证件号码|-|
|gender|string|性别|-|
|birthDate|string|出生日期|-|
|education|string|最高学历|-|
|politicalStatus|string|政治面貌|-|
|projectCode|string|项目id|-|
|projectName|string|项目名称|-|
|agreementBranchOrgCode|string|协议归属组织编码|-|
|agreementBranchOrgName|string|协议归属组织名称|-|
|onboardDate|string|入场日期|-|
|offboardDate|string|离场日期|-|
|autoAuthorize|int32|是否自动授权|-|
|businessCategory|string|业务分类|-|
|age|int32|年龄|-|
|ethnic|string|民族|-|
|household|string|户口类型|-|
|workStartDate|string|开始工作时间|-|
|email|string|邮箱|-|
|highestEducation|string|最高学历学制|-|
|major|string|所学专业|-|
|highestDegree|string|最高学位|-|
|mailingAddress|string|通讯地址|-|
|picture|string|照片|-|
|workLocation|string|工作所在地|-|
|workLocationName|string|工作所在地名称|-|
|employmentCategory|string|用工类型|-|
|regionName|string|区域名称|-|

**Response-example:**

```
[
  {
    "staffId": "184",
    "accountId": "184",
    "displayName": "reynaldo.beahan",
    "phone": "1-320-206-5035",
    "branchOrgCode": "8865",
    "branchOrgName": "reynaldo.beahan",
    "operatingOrgCode": "8865",
    "operatingOrgName": "reynaldo.beahan",
    "agreementNo": "4lassg",
    "agreementName": "reynaldo.beahan",
    "businessLineCode": "8865",
    "businessLineName": "reynaldo.beahan",
    "workPositionCode": "8865",
    "workPositionName": "reynaldo.beahan",
    "standardPositionCode": "8865",
    "standardPositionName": "reynaldo.beahan",
    "supplierId": "184",
    "supplierName": "reynaldo.beahan",
    "staffStatus": "qgazn5",
    "certificateType": "vdiz81",
    "certificateNumber": "yj1299",
    "gender": "8s3jte",
    "birthDate": "2025-11-13",
    "education": "5vul9i",
    "politicalStatus": "gfg5na",
    "projectCode": "8865",
    "projectName": "reynaldo.beahan",
    "agreementBranchOrgCode": "8865",
    "agreementBranchOrgName": "reynaldo.beahan",
    "onboardDate": "2025-11-13",
    "offboardDate": "2025-11-13",
    "autoAuthorize": 14,
    "businessCategory": "bfzddr",
    "age": 5,
    "ethnic": "awe6k8",
    "household": "axwxxg",
    "workStartDate": "2025-11-13",
    "email": "kathline.donnelly@yahoo.com",
    "highestEducation": "pmytlq",
    "major": "6bfss0",
    "highestDegree": "ddynsa",
    "mailingAddress": "Apt. 858 4464 Luanna Stravenue， New Lessie， IL 74374-0921",
    "picture": "112i8f",
    "workLocation": "e6r8ch",
    "workLocationName": "reynaldo.beahan",
    "employmentCategory": "j2c4lc",
    "regionName": "reynaldo.beahan"
  }
]
```

### 3. 分页获取外部员工详情列表

**URL:** /platform/api/aboss/hrms/staff/rpc/query-page-staff-list

**Type:** GET

**Author:** zhanghua

**Content-Type:** application/json; charset=utf-8

**Description:** com.aliyunfsi.insurance.hrms.facade.staff.OutsourcedStaffFacade#queryPageStaffList(com.aliyunfsi.insurance.hrms.facade.dto.req.OutStaffQry)

**Body-parameters:**

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|current|int32|当前页码|true|-|
|pageSize|int32|每页展示条数|true|-|
|accountId|string|账户id|false|-|
|displayName|string|显示名称(左匹配模糊查询)|false|-|
|phone|string|手机号|false|-|
|certificateType|string|证件类型|false|-|
|certificateNumber|string|证件号码|false|-|
|branchOrgCodeList|array|归属组织编码集合(返回当前机构,不超过100个)|false|-|
|workPositionCodeList|array|工作岗位编码集合（不超过100个)|false|-|
|standardPositionCodeList|array|标准岗位编码集合不超过100个)|false|-|

**Request-example:**

```
curl -X GET -H 'Content-Type: application/json; charset=utf-8' -i /platform/api/aboss/hrms/staff/rpc/query-page-staff-list --data '{
  "current": 721,
  "pageSize": 10,
  "accountId": "184",
  "displayName": "reynaldo.beahan",
  "phone": "1-320-206-5035",
  "certificateType": "ik9hv9",
  "certificateNumber": "0gc8e3",
  "branchOrgCodeList": [
    "8zr99y"
  ],
  "workPositionCodeList": [
    "du0mzr"
  ],
  "standardPositionCodeList": [
    "jx51d3"
  ]
}'
```

**Response-fields:**

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|total|int64|No comments found.|-|
|current|int64|No comments found.|-|
|pageSize|int64|No comments found.|-|
|list|array|No comments found.|-|
|└─staffId|string|员工id|-|
|└─accountId|string|账号|-|
|└─displayName|string|显示名称|-|
|└─phone|string|手机号|-|
|└─branchOrgCode|string|归属组织编码|-|
|└─branchOrgName|string|归属组织名称|-|
|└─operatingOrgCode|string|归属经营组织编码|-|
|└─operatingOrgName|string|归属经营组织名称|-|
|└─agreementNo|string|关联协议ID|-|
|└─agreementName|string|协议名称|-|
|└─businessLineCode|string|业务线|-|
|└─businessLineName|string|业务线名称|-|
|└─workPositionCode|string|工作岗位|-|
|└─workPositionName|string|工作岗位名称|-|
|└─standardPositionCode|string|标准岗位|-|
|└─standardPositionName|string|标准岗位名称|-|
|└─supplierId|string|供应商|-|
|└─supplierName|string|供应商名称|-|
|└─staffStatus|string|在职状态(-3入场审批中,-2审批通过待入场,-1未入场,0已入场,1已离场,2离场审批中,3审批通过待离场)|-|
|└─certificateType|string|证件类型|-|
|└─certificateNumber|string|证件号码|-|
|└─gender|string|性别|-|
|└─birthDate|string|出生日期|-|
|└─education|string|最高学历|-|
|└─politicalStatus|string|政治面貌|-|
|└─projectCode|string|项目id|-|
|└─projectName|string|项目名称|-|
|└─agreementBranchOrgCode|string|协议归属组织编码|-|
|└─agreementBranchOrgName|string|协议归属组织名称|-|
|└─onboardDate|string|入场日期|-|
|└─offboardDate|string|离场日期|-|
|└─autoAuthorize|int32|是否自动授权|-|
|└─businessCategory|string|业务分类|-|
|└─age|int32|年龄|-|
|└─ethnic|string|民族|-|
|└─household|string|户口类型|-|
|└─workStartDate|string|开始工作时间|-|
|└─email|string|邮箱|-|
|└─highestEducation|string|最高学历学制|-|
|└─major|string|所学专业|-|
|└─highestDegree|string|最高学位|-|
|└─mailingAddress|string|通讯地址|-|
|└─picture|string|照片|-|
|└─workLocation|string|工作所在地|-|
|└─workLocationName|string|工作所在地名称|-|
|└─employmentCategory|string|用工类型|-|
|└─regionName|string|区域名称|-|

**Response-example:**

```
{
  "total": 0,
  "current": 449,
  "pageSize": 887,
  "list": [
    {
      "staffId": "184",
      "accountId": "184",
      "displayName": "reynaldo.beahan",
      "phone": "1-320-206-5035",
      "branchOrgCode": "8865",
      "branchOrgName": "reynaldo.beahan",
      "operatingOrgCode": "8865",
      "operatingOrgName": "reynaldo.beahan",
      "agreementNo": "v6qzkm",
      "agreementName": "reynaldo.beahan",
      "businessLineCode": "8865",
      "businessLineName": "reynaldo.beahan",
      "workPositionCode": "8865",
      "workPositionName": "reynaldo.beahan",
      "standardPositionCode": "8865",
      "standardPositionName": "reynaldo.beahan",
      "supplierId": "184",
      "supplierName": "reynaldo.beahan",
      "staffStatus": "u5mwxp",
      "certificateType": "d4w9fh",
      "certificateNumber": "yr75k3",
      "gender": "elr871",
      "birthDate": "2025-11-13",
      "education": "tec9nf",
      "politicalStatus": "vx5rzn",
      "projectCode": "8865",
      "projectName": "reynaldo.beahan",
      "agreementBranchOrgCode": "8865",
      "agreementBranchOrgName": "reynaldo.beahan",
      "onboardDate": "2025-11-13",
      "offboardDate": "2025-11-13",
      "autoAuthorize": 950,
      "businessCategory": "fbuwnl",
      "age": 5,
      "ethnic": "2dk9vs",
      "household": "6pvstd",
      "workStartDate": "2025-11-13",
      "email": "kathline.donnelly@yahoo.com",
      "highestEducation": "9s3sc1",
      "major": "a9ujk0",
      "highestDegree": "ecddgm",
      "mailingAddress": "Apt. 858 4464 Luanna Stravenue， New Lessie， IL 74374-0921",
      "picture": "goo2a8",
      "workLocation": "kjkyow",
      "workLocationName": "reynaldo.beahan",
      "employmentCategory": "t11itr",
      "regionName": "reynaldo.beahan"
    }
  ]
}
```

  

  

### 4. 获取外部员工详情列表

**URL:** /platform/api/aboss/hrms/staff/rpc/query-staff-list-by-org-code

**Type:** POST

**Author:** zhanghua

**Content-Type:** application/jsoPOSTn; charset=utf-8

**Description:** com.aliyunfsi.insurance.hrms.facade.staff.OutsourcedStaffFacade#queryStaffListByOrgCode(com.aliyunfsi.insurance.hrms.facade.dto.req.OutStaffOrgQry)

**Body-parameters:**

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|branchOrgCode|String|归属组织编码|true|-|

**Request-example:**

```
curl -X GET -H 'Content-Type: application/json; charset=utf-8' -i /platform/api/aboss/hrms/staff/rpc/query-page-staff-list --data '{
  "branchOrgCode": 721
}'
```

**Response-fields:**

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|arrays||||
|└─staffId|string|员工id|-|
|└─accountId|string|账号|-|
|└─displayName|string|显示名称|-|
|└─phone|string|手机号|-|
|└─branchOrgCode|string|归属组织编码|-|
|└─branchOrgName|string|归属组织名称|-|
|└─operatingOrgCode|string|归属经营组织编码|-|
|└─operatingOrgName|string|归属经营组织名称|-|
|└─agreementNo|string|关联协议ID|-|
|└─agreementName|string|协议名称|-|
|└─businessLineCode|string|业务线|-|
|└─businessLineName|string|业务线名称|-|
|└─workPositionCode|string|工作岗位|-|
|└─workPositionName|string|工作岗位名称|-|
|└─standardPositionCode|string|标准岗位|-|
|└─standardPositionName|string|标准岗位名称|-|
|└─supplierId|string|供应商|-|
|└─supplierName|string|供应商名称|-|
|└─staffStatus|string|在职状态(-3入场审批中,-2审批通过待入场,-1未入场,0已入场,1已离场,2离场审批中,3审批通过待离场)|-|
|└─certificateType|string|证件类型|-|
|└─certificateNumber|string|证件号码|-|
|└─gender|string|性别|-|
|└─birthDate|string|出生日期|-|
|└─education|string|最高学历|-|
|└─politicalStatus|string|政治面貌|-|
|└─projectCode|string|项目id|-|
|└─projectName|string|项目名称|-|
|└─agreementBranchOrgCode|string|协议归属组织编码|-|
|└─agreementBranchOrgName|string|协议归属组织名称|-|
|└─onboardDate|string|入场日期|-|
|└─offboardDate|string|离场日期|-|
|└─autoAuthorize|int32|是否自动授权|-|
|└─businessCategory|string|业务分类|-|
|└─age|int32|年龄|-|
|└─ethnic|string|民族|-|
|└─household|string|户口类型|-|
|└─workStartDate|string|开始工作时间|-|
|└─email|string|邮箱|-|
|└─highestEducation|string|最高学历学制|-|
|└─major|string|所学专业|-|
|└─highestDegree|string|最高学位|-|
|└─mailingAddress|string|通讯地址|-|
|└─picture|string|照片|-|
|└─workLocation|string|工作所在地|-|
|└─workLocationName|string|工作所在地名称|-|
|└─employmentCategory|string|用工类型|-|
|└─regionName|string|区域名称|-|

**Response-example:**

```
{
  "list": [
    {
      "staffId": "184",
      "accountId": "184",
      "displayName": "reynaldo.beahan",
      "phone": "1-320-206-5035",
      "branchOrgCode": "8865",
      "branchOrgName": "reynaldo.beahan",
      "operatingOrgCode": "8865",
      "operatingOrgName": "reynaldo.beahan",
      "agreementNo": "v6qzkm",
      "agreementName": "reynaldo.beahan",
      "businessLineCode": "8865",
      "businessLineName": "reynaldo.beahan",
      "workPositionCode": "8865",
      "workPositionName": "reynaldo.beahan",
      "standardPositionCode": "8865",
      "standardPositionName": "reynaldo.beahan",
      "supplierId": "184",
      "supplierName": "reynaldo.beahan",
      "staffStatus": "u5mwxp",
      "certificateType": "d4w9fh",
      "certificateNumber": "yr75k3",
      "gender": "elr871",
      "birthDate": "2025-11-13",
      "education": "tec9nf",
      "politicalStatus": "vx5rzn",
      "projectCode": "8865",
      "projectName": "reynaldo.beahan",
      "agreementBranchOrgCode": "8865",
      "agreementBranchOrgName": "reynaldo.beahan",
      "onboardDate": "2025-11-13",
      "offboardDate": "2025-11-13",
      "autoAuthorize": 950,
      "businessCategory": "fbuwnl",
      "age": 5,
      "ethnic": "2dk9vs",
      "household": "6pvstd",
      "workStartDate": "2025-11-13",
      "email": "kathline.donnelly@yahoo.com",
      "highestEducation": "9s3sc1",
      "major": "a9ujk0",
      "highestDegree": "ecddgm",
      "mailingAddress": "Apt. 858 4464 Luanna Stravenue， New Lessie， IL 74374-0921",
      "picture": "goo2a8",
      "workLocation": "kjkyow",
      "workLocationName": "reynaldo.beahan",
      "employmentCategory": "t11itr",
      "regionName": "reynaldo.beahan"
    }
  ]
}
```

  

### 5. 分页获取外部员工详情列表(机构本级和下级机构)

**URL:** /platform/api/aboss/hrms/staff/rpc/query-page-staff

**Type:** GET

**Author:** zhanghua

**Content-Type:** application/json; charset=utf-8

**Description:** com.aliyunfsi.insurance.hrms.facade.staff.OutsourcedStaffFacade#queryPageStaff(com.aliyunfsi.insurance.hrms.facade.dto.req.OutStaffPageQry)

**Body-parameters:**

|   |   |   |   |   |
|---|---|---|---|---|
|Parameter|Type|Description|Required|Since|
|current|int32|当前页码|true|-|
|pageSize|int32|每页展示条数|true|-|
|accountId|string|账户id|false|-|
|displayName|string|显示名称(左匹配模糊查询)|false|-|
|phone|string|手机号|false|-|
|certificateType|string|证件类型|false|-|
|certificateNumber|string|证件号码|false|-|
|branchOrgCode|string|归属组织编码|false|-|

**Request-example:**

```
curl -X GET -H 'Content-Type: application/json; charset=utf-8' -i /platform/api/aboss/hrms/staff/rpc/query-page-staff-list --data '{
  "current": 721,
  "pageSize": 10,
  "accountId": "184",
  "displayName": "reynaldo.beahan",
  "phone": "1-320-206-5035",
  "certificateType": "ik9hv9",
  "certificateNumber": "0gc8e3",
  "branchOrgCode": "8zr99y"
}'
```

**Response-fields:**

|   |   |   |   |
|---|---|---|---|
|Field|Type|Description|Since|
|total|int64|No comments found.|-|
|current|int64|No comments found.|-|
|pageSize|int64|No comments found.|-|
|list|array|No comments found.|-|
|└─staffId|string|员工id|-|
|└─accountId|string|账号|-|
|└─displayName|string|显示名称|-|
|└─phone|string|手机号|-|
|└─branchOrgCode|string|归属组织编码|-|
|└─branchOrgName|string|归属组织名称|-|
|└─operatingOrgCode|string|归属经营组织编码|-|
|└─operatingOrgName|string|归属经营组织名称|-|
|└─agreementNo|string|关联协议ID|-|
|└─agreementName|string|协议名称|-|
|└─businessLineCode|string|业务线|-|
|└─businessLineName|string|业务线名称|-|
|└─workPositionCode|string|工作岗位|-|
|└─workPositionName|string|工作岗位名称|-|
|└─standardPositionCode|string|标准岗位|-|
|└─standardPositionName|string|标准岗位名称|-|
|└─supplierId|string|供应商|-|
|└─supplierName|string|供应商名称|-|
|└─staffStatus|string|在职状态(-3入场审批中,-2审批通过待入场,-1未入场,0已入场,1已离场,2离场审批中,3审批通过待离场)|-|
|└─certificateType|string|证件类型|-|
|└─certificateNumber|string|证件号码|-|
|└─gender|string|性别|-|
|└─birthDate|string|出生日期|-|
|└─education|string|最高学历|-|
|└─politicalStatus|string|政治面貌|-|
|└─projectCode|string|项目id|-|
|└─projectName|string|项目名称|-|
|└─agreementBranchOrgCode|string|协议归属组织编码|-|
|└─agreementBranchOrgName|string|协议归属组织名称|-|
|└─onboardDate|string|入场日期|-|
|└─offboardDate|string|离场日期|-|
|└─autoAuthorize|int32|是否自动授权|-|
|└─businessCategory|string|业务分类|-|
|└─age|int32|年龄|-|
|└─ethnic|string|民族|-|
|└─household|string|户口类型|-|
|└─workStartDate|string|开始工作时间|-|
|└─email|string|邮箱|-|
|└─highestEducation|string|最高学历学制|-|
|└─major|string|所学专业|-|
|└─highestDegree|string|最高学位|-|
|└─mailingAddress|string|通讯地址|-|
|└─picture|string|照片|-|
|└─workLocation|string|工作所在地|-|
|└─workLocationName|string|工作所在地名称|-|
|└─employmentCategory|string|用工类型|-|
|└─regionName|string|区域名称|-|

**Response-example:**

```
{
  "total": 0,
  "current": 449,
  "pageSize": 887,
  "list": [
    {
      "staffId": "184",
      "accountId": "184",
      "displayName": "reynaldo.beahan",
      "phone": "1-320-206-5035",
      "branchOrgCode": "8865",
      "branchOrgName": "reynaldo.beahan",
      "operatingOrgCode": "8865",
      "operatingOrgName": "reynaldo.beahan",
      "agreementNo": "v6qzkm",
      "agreementName": "reynaldo.beahan",
      "businessLineCode": "8865",
      "businessLineName": "reynaldo.beahan",
      "workPositionCode": "8865",
      "workPositionName": "reynaldo.beahan",
      "standardPositionCode": "8865",
      "standardPositionName": "reynaldo.beahan",
      "supplierId": "184",
      "supplierName": "reynaldo.beahan",
      "staffStatus": "u5mwxp",
      "certificateType": "d4w9fh",
      "certificateNumber": "yr75k3",
      "gender": "elr871",
      "birthDate": "2025-11-13",
      "education": "tec9nf",
      "politicalStatus": "vx5rzn",
      "projectCode": "8865",
      "projectName": "reynaldo.beahan",
      "agreementBranchOrgCode": "8865",
      "agreementBranchOrgName": "reynaldo.beahan",
      "onboardDate": "2025-11-13",
      "offboardDate": "2025-11-13",
      "autoAuthorize": 950,
      "businessCategory": "fbuwnl",
      "age": 5,
      "ethnic": "2dk9vs",
      "household": "6pvstd",
      "workStartDate": "2025-11-13",
      "email": "kathline.donnelly@yahoo.com",
      "highestEducation": "9s3sc1",
      "major": "a9ujk0",
      "highestDegree": "ecddgm",
      "mailingAddress": "Apt. 858 4464 Luanna Stravenue， New Lessie， IL 74374-0921",
      "picture": "goo2a8",
      "workLocation": "kjkyow",
      "workLocationName": "reynaldo.beahan",
      "employmentCategory": "t11itr",
      "regionName": "reynaldo.beahan"
    }
  ]
}
```

### 6. 员工异动列表查询接口

##### 6.1. 接口说明

根据外包员工账号 `accountId` 查询该账号的全部员工异动记录。

- 接口类型：SOFA RPC（Bolt）
- 所属 Facade：`OutsourcedStaffFacade`
- 是否分页：否
- 排序规则：按异动创建时间 `gmtCreate` 倒序
- Facade 版本：`1.0.3-SNAPSHOT`

##### 6.2. 接口定义

```
ResultModel<List<OutStaffMovementDTO>> queryStaffMovementList(
        OutStaffIdQry outStaffIdQry
);
```

##### 6.3. 请求参数

请求类型：`OutStaffIdQry`

|   |   |   |   |
|---|---|---|---|
|字段|类型|必填|说明|
|`accountId`|`String`|是|外包员工账号，对应异动表的 `account_id`|

校验规则：

- `accountId` 不能为空；
- 为空时返回参数校验错误：`账户id不能为空`。

调用示例：

```
OutStaffIdQry request = new OutStaffIdQry()
        .setAccountId("zhangsan");

ResultModel<List<OutStaffMovementDTO>> result =
        outsourcedStaffFacade.queryStaffMovementList(request);
```

##### 6.4. 返回结果

返回类型：

```
ResultModel<List<OutStaffMovementDTO>>
```

`ResultModel` 的 `data` 字段为员工异动列表。没有异动记录时返回成功的空列表 `[]`，不会返回 `null`。

##### 6.5. 异动核心字段

|   |   |   |
|---|---|---|
|字段|类型|说明|
|`staffId`|`String`|异动记录标识，沿用现有异动列表转换规则|
|`accountId`|`String`|外包员工账号|
|`displayName`|`String`|员工姓名|
|`phone`|`String`|异动记录中的手机号|
|`historyPhone`|`String`|历史手机号|
|`staffStatus`|`String`|员工在职状态|
|`requestId`|`String`|审批请求 ID|
|`flowInstanceId`|`String`|流程实例 ID|
|`sourceFrom`|`String`|数据来源|
|`onboardDate`|`Date`|入场日期|
|`offboardDate`|`Date`|离场日期|
|`agreementStartDate`|`Date`|本次任职使用协议的开始日期|
|`agreementEndDate`|`Date`|本次任职使用协议的结束日期|
|`gmtCreate`|`Date`|异动记录创建时间|
|`modifier`|`String`|最后操作人，能够查询到名称时格式为“名称-账号”|
|`gmtModified`|`Date`|异动时间，当前与异动记录创建时间一致|
|`creator`|`String`|员工创建人|
|`description`|`String`|工作内容描述|
|`relatedAccountId`|`String`|历史内部账号关联；异动表不保存该字段，固定为空|

##### 6.6. 组织字段

|   |   |   |
|---|---|---|
|字段|类型|说明|
|`branchOrgCode`|`String`|归属组织编码|
|`branchOrgName`|`String`|归属组织名称|
|`operatingOrgCode`|`String`|归属经营组织编码|
|`operatingOrgName`|`String`|归属经营组织名称|
|`branchCompanySimpleName`|`String`|归属分公司简称|
|`branchCenterSimpleName`|`String`|归属中支公司简称|
|`branchSimpleName`|`String`|归属支公司简称|
|`workLocation`|`String`|工作所在地编码|
|`workLocationName`|`String`|工作所在地名称|
|`regionName`|`String`|区域名称|

##### 6.7. 协议、项目及岗位字段

|   |   |   |
|---|---|---|
|字段|类型|说明|
|`agreementNo`|`String`|协议编号|
|`agreementName`|`String`|协议名称|
|`agreementBranchOrgCode`|`String`|协议归属组织编码|
|`agreementBranchOrgName`|`String`|协议归属组织名称|
|`supplierId`|`String`|供应商 ID|
|`supplierName`|`String`|供应商名称|
|`projectCode`|`String`|项目编号|
|`projectName`|`String`|项目名称|
|`businessLineCode`|`String`|业务线编码|
|`businessLineName`|`String`|业务线名称|
|`workPositionCode`|`String`|工作岗位编码|
|`workPositionName`|`String`|工作岗位名称|
|`standardPositionCode`|`String`|标准岗位编码|
|`standardPositionName`|`String`|标准岗位名称|
|`autoAuthorize`|`String`|是否自动授权：`0` 否、`1` 是|
|`positionClassification`|`String`|工作岗位分类|
|`professionalGrade`|`String`|专业层次|
|`businessCategory`|`String`|业务分类|
|`employmentCategory`|`String`|用工类型|

##### 6.8. 员工个人信息字段

|   |   |   |
|---|---|---|
|字段|类型|说明|
|`certificateType`|`String`|证件类型|
|`certificateNumber`|`String`|证件号码|
|`gender`|`String`|性别|
|`birthDate`|`String`|出生日期，格式通常为 `yyyy-MM-dd`|
|`age`|`Integer`|根据出生日期动态计算的年龄|
|`education`|`String`|最高学历|
|`highestEducation`|`String`|最高学历学制|
|`major`|`String`|所学专业|
|`highestDegree`|`String`|最高学位|
|`politicalStatus`|`String`|政治面貌|
|`ethnic`|`String`|民族|
|`household`|`String`|户口类型|
|`workStartDate`|`String`|开始工作时间|
|`email`|`String`|邮箱|
|`mailingAddress`|`String`|通讯地址|
|`picture`|`String`|照片信息|

##### 6.9. 在职状态说明

|   |   |
|---|---|
|值|说明|
|`-3`|入场审批中|
|`-2`|审批通过待入场|
|`-1`|待入场|
|`0`|已入场|
|`1`|已离场|
|`2`|离场审批中|
|`3`|审批通过待离场|

##### 6.10. 返回数据示例

以下仅展示 `ResultModel.data`：

```
[
  {
    "staffId": "190001234567890001",
    "accountId": "zhangsan",
    "displayName": "张三",
    "phone": "13800000000",
    "staffStatus": "0",
    "branchOrgCode": "ORG001",
    "branchOrgName": "浙江分公司",
    "operatingOrgCode": "ORG001",
    "operatingOrgName": "浙江分公司",
    "branchCompanySimpleName": "浙江",
    "agreementNo": "AG20260001",
    "agreementName": "2026年度技术服务协议",
    "supplierId": "SUP001",
    "supplierName": "示例供应商",
    "projectCode": "PROJECT001",
    "projectName": "核心系统建设项目",
    "businessLineCode": "BL001",
    "businessLineName": "数字科技",
    "workPositionCode": "POSITION001",
    "workPositionName": "Java开发工程师",
    "agreementStartDate": "2026-01-01T00:00:00.000+08:00",
    "agreementEndDate": "2026-12-31T00:00:00.000+08:00",
    "gmtCreate": "2026-07-20T10:00:00.000+08:00",
    "modifier": "李四-lisi",
    "gmtModified": "2026-07-20T10:00:00.000+08:00",
    "relatedAccountId": null
  }
]
```
