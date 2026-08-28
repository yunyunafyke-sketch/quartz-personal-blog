---
publish: true
---

https://cic_irc.yuque.com/tyl581/ggwv9w/gxohhk0q4w9tuvl1

## Maven 依赖

```
<dependency>
 <groupId>com.aliyun.fsi.insurance</groupId>
 <artifactId>aboss-sso-client</artifactId>
 <version>1.3.6-RELEASE</version>
</dependency>
```

---

# Aboss-SSO RPC 接口文档

接口定义：`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade`  
接口实现：`com.aliyun.fsi.insurance.sso.impl.AccountRpcFacadeImpl`  
传输协议：SOFA Bolt  
统一响应结构：`ResultModel<T>` / `PageResultModelSupport<T>`

---

## 一、账号查询相关

### 1.1 根据账户id查询用户详细信息

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountInfo(AccountIdQry accountIdQry)`|
|**接口描述**|根据账户id查询用户详细信息|
|**是否需要认证**|否|

**请求参数（AccountIdQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|accId|String|是|账户id|

**响应结果（AccountDetailDTO）**

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|accId|String|账户Id|
|accountName|String|登录名称|
|externalId|String|外部id|
|displayName|String|显示名称|
|accountRole|String|账户角色(1:普通用户，2:超级管理员)|
|accountType|String|账户类型(0:内部账户，1:外部账户)|
|phoneNo|String|手机号|
|email|String|邮箱（已废弃）|
|accountStartDt|String|账户有效期-起期|
|accountEndDt|String|账户有效期-止期|
|expire|Boolean|账号过期状态 (true: 过期, false: 正常)|
|faceId|String|人脸识别图片fileid|
|avatarId|String|账户图片fileid|
|branchOrgCode|String|归属组织编码|
|branchOrgName|String|归属组织名称|
|operatingOrgCode|String|所属经营组织编码|
|operatingOrgName|String|所属经营组织名称|
|externalSource|String|外部id所属来源(应用名)|
|externalHead|String|外部负责人|
|externalClassification|String|外部账户业务分类|
|enabled|Boolean|账户状态(true:启用，false:禁用)|
|isValid|Boolean|是否有效|
|twoFactor|Boolean|二次认证状态(true:开启，false:关闭)|
|dingUserId|String|钉钉userId|
|relatedAccountId|String|关联账户id(双向对称)|
|gmtModified|Date|修改时间|

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如账户id为空）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 1.2 根据账户id集合查找用户详细信息列表

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountListByAccountIds(AccountIdsQry accountIdsQry)`|
|**接口描述**|根据账户id集合查找用户详细信息列表（最多支持100条）|
|**是否需要认证**|否|

**请求参数（AccountIdsQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|accIds|List<String>|是|账户id集合（最多100条）|

**响应结果**

返回 `ResultModel<List<AccountDetailDTO>>`，AccountDetailDTO 字段同 1.1。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如账户id集合为空或超过100条）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 1.3 根据归属组织编码查找用户详细信息集合（不包含下级机构）

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountListByBranchOrgCode(BranchOrgCodeQry branchOrgCodeQry)`|
|**接口描述**|根据归属组织编码查找用户详细信息集合（不包含下级机构）|
|**是否需要认证**|否|

**请求参数（BranchOrgCodeQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|branchOrgCode|String|是|归属组织编码|
|isValid|Boolean|否|在职状态(true:在职，false:离职，不传返回所有)|

**响应结果**

返回 `ResultModel<List<AccountDetailDTO>>`，AccountDetailDTO 字段同 1.1。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如归属组织编码为空）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 1.4 根据关键字模糊查询（分页，最多返回100条）

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountListByKeyword(KeywordQry keywordQry)`|
|**接口描述**|根据账户名/用户名模糊查询（分页，最多返回100条）|
|**是否需要认证**|否|

**请求参数（KeywordQry，继承 PageQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|keyword|String|是|模糊查询关键字（支持账号名、用户名）|
|pageSize|Integer|是|每页展示条数（最大100条）|
|pageIndex|Integer|是|当前页码|

**响应结果（PageResultModelSupport）**

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|code|String|响应码|
|msg|String|响应消息|
|data|List<AccountDetailDTO>|账户详情列表|
|totalCount|Integer|总记录数|
|pageIndex|Integer|当前页码|
|pageSize|Integer|每页条数|

AccountDetailDTO 字段同 1.1。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如关键字为空、分页参数非法）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 1.5 根据账户手机号查询账户详情

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountInfoByPhoneNo(AccountPhoneNoQry accountPhoneNoQry)`|
|**接口描述**|根据账户手机号查询账户详情|
|**是否需要认证**|否|

**请求参数（AccountPhoneNoQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|phoneNo|String|是|手机号（11位数字）|

**响应结果**

返回 `ResultModel<AccountDetailDTO>`，AccountDetailDTO 字段同 1.1。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如手机号为空或格式不正确）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 1.6 根据钉钉userId获取账号信息

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountInfoByDingUserId(AccountDingUserIdQry accountDingUserIdQry)`|
|**接口描述**|根据钉钉userId获取账号信息|
|**是否需要认证**|否|

**请求参数（AccountDingUserIdQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|dingUserId|String|是|钉钉id|

**响应结果**

返回 `ResultModel<AccountDetailDTO>`，AccountDetailDTO 字段同 1.1。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如钉钉id为空）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 1.7 根据账户id查询人脸识别图片

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountFaceImage(AccountFullIdQry accountFullIdQry)`|
|**接口描述**|根据账户id查询人脸识别图片|
|**是否需要认证**|否|

**请求参数（AccountFullIdQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|accountId|String|是|账户id|

**响应结果（AccountFaceImageDTO）**

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|fileId|String|文件id|
|fileName|String|文件名|
|size|Long|文件大小|
|mimeType|String|文件mime类型|
|gmtCreate|Date|创建（上传）时间|
|url|String|图片url|
|thnUrl|String|缩略图url|
|accountId|String|账户Id|
|accountName|String|登录名称|

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如账户id为空）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 1.8 根据账户信息查询账户信息列表（分页，最多返回100条）

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountListByAccount(AccountFullQry accountFullQry)`|
|**接口描述**|根据账户信息查询账户信息列表（分页，最多返回100条）|
|**是否需要认证**|否|

**请求参数（AccountFullQry，继承 PageQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|accId|String|否|账户id|
|displayName|String|否|显示名(模糊查询左匹配)|
|accountType|String|否|账户类型(0:内部账户，1:外部账户)|
|branchOrgCode|String|否|归属组织编码(返回当前机构以及子机构)|
|enabled|Boolean|否|是否启用(true:启用，false:停用)|
|isValid|Boolean|否|在职状态(true:在职，false:离职)|
|pageSize|Integer|是|每页展示条数（最大100条）|
|pageIndex|Integer|是|当前页码|

**响应结果（PageResultModelSupport）**

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|code|String|响应码|
|msg|String|响应消息|
|data|List<AccountDetailDTO>|账户详情列表|
|totalCount|Integer|总记录数|
|pageIndex|Integer|当前页码|
|pageSize|Integer|每页条数|

AccountDetailDTO 字段同 1.1。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如分页参数非法）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 1.9 根据登录时间范围分页获取账号信息

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountListByLoginTime(AccountLoginTimeQry accountLoginTimeQry)`|
|**接口描述**|根据登录时间范围分页获取账号信息（分页，最多返回100条）|
|**是否需要认证**|否|

**请求参数（AccountLoginTimeQry，继承 PageQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|loginTimeStart|Date|是|登录时间起期（格式：yyyy-MM-dd HH:mm:ss）|
|loginTimeEnd|Date|否|登录时间止期（格式：yyyy-MM-dd HH:mm:ss）|
|pageSize|Integer|是|每页展示条数（最大100条）|
|pageIndex|Integer|是|当前页码|

**响应结果（PageResultModelSupport）**

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|code|String|响应码|
|msg|String|响应消息|
|data|List<AccountNameDTO>|账号信息列表|
|totalCount|Integer|总记录数|
|pageIndex|Integer|当前页码|
|pageSize|Integer|每页条数|

**AccountNameDTO 字段说明**

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|accId|String|账号id|
|displayName|String|显示名称|

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如登录时间起期为空、分页参数非法）|
|NO_DATA_AVAILABLE|无可用数据|

---

## 二、外部账号相关

### 2.1 根据外部id+外部来源查询外部账户集合

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountListByExternalIds(AccountExternalIdsQry accountExternalIdsQry)`|
|**接口描述**|根据外部id+外部来源查询外部账户集合（最多支持100条）|
|**是否需要认证**|否|

**请求参数（AccountExternalIdsQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|externalIds|List<String>|是|外部id集合（最大100条）|
|externalSource|String|是|外部来源|

**响应结果**

返回 `ResultModel<List<AccountDetailDTO>>`，AccountDetailDTO 字段同 1.1。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如externalId为空、externalSource为空、超过100条限制）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 2.2 根据外部账户来源查询账户信息（分页，最多返回100条）

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#accountListByExternalSource(ExternalSourceQry externalSourceQry)`|
|**接口描述**|根据外部账户来源查询账户信息（分页，最多返回100条）|
|**是否需要认证**|否|

**请求参数（ExternalSourceQry，继承 PageQry）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|externalSource|String|是|外部来源|
|isValid|Boolean|否|在职状态(true:在职，false:离职，不传返回所有)|
|pageSize|Integer|是|每页展示条数（最大100条）|
|pageIndex|Integer|是|当前页码|

**响应结果（PageResultModelSupport）**

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|code|String|响应码|
|msg|String|响应消息|
|data|List<AccountDetailDTO>|账户详情列表|
|totalCount|Integer|总记录数|
|pageIndex|Integer|当前页码|
|pageSize|Integer|每页条数|

AccountDetailDTO 字段同 1.1。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误（如外部来源为空、分页参数非法）|
|NO_DATA_AVAILABLE|无可用数据|

---

### 2.3 创建外部账户

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#createExternalAccount(ExternalAccountAddCmd externalAccountAddCmd)`|
|**接口描述**|创建外部账户|
|**是否需要认证**|是|

**请求参数（ExternalAccountAddCmd）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|externalId|String|是|外部id|
|displayName|String|是|显示名|
|customCode|String|否|自定义编码(账户名=zhex+2位账号来源简称+4位customCode+5位随机流水号)|
|joinCompDt|String|否|入司日期（yyyy-MM-dd）|
|leaveCompDt|String|否|过期时间(yyyy-MM-dd,不填默认当前时间延后三个月过期)|
|phoneNo|String|是|手机号|
|email|String|否|邮箱|
|faceId|String|否|人脸照片，仅对hrms系统推送账户时使用|
|branchOrgCode|String|是|机构编码|
|externalHead|String|是|外部负责人|
|externalSource|String|是|外部来源|
|externalClassification|String|否|外部业务分类编码|
|relatedAccountId|String|否|关联账户id(双向对称)|

**响应结果**

返回 `String` 类型，为创建的账户id（accId）。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误|
|PHONE_OR_EMAIL_DUPLICATE|手机号或者邮箱重复|
|THIRD_ERROR|第三方错误|
|UNKNOWN_SYSTEM_ERROR|未知系统异常|

---

### 2.4 修改外部账户

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#updateExternalAccount(ExternalAccountUpdateCmd externalAccountUpdateCmd)`|
|**接口描述**|修改外部账户信息|
|**是否需要认证**|是|

**请求参数（ExternalAccountUpdateCmd）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|accId|String|否|账户id（优先使用）|
|externalId|String|否|外部id（已废弃，使用 accId 代替）|
|displayName|String|否|显示名|
|accountStartDt|String|否|入司日期（yyyy-MM-dd）|
|accountEndDt|String|否|过期时间(yyyy-MM-dd,不填默认当前时间延后三个月过期)|
|phoneNo|String|否|手机号|
|email|String|否|邮箱|
|faceId|String|否|人脸照片，仅对hrms系统推送账户时使用|
|branchOrgCode|String|否|机构编码|
|externalHead|String|否|外部负责人|
|externalSource|String|是|外部来源|
|externalClassification|String|否|外部业务分类编码|
|relatedAccountId|String|否|关联账户id(双向对称)|

**响应结果**

返回 `String` 类型，为修改后的账户id（accId）。

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误|
|NO_DATA_AVAILABLE|无可用数据|
|PHONE_OR_EMAIL_DUPLICATE|手机号或者邮箱重复|
|THIRD_ERROR|第三方错误|
|UNKNOWN_SYSTEM_ERROR|未知系统异常|

---

### 2.5 离职外部账户

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#invalidExternalAccount(ExternalAccountInvalidCmd externalAccountInvalidCmd)`|
|**接口描述**|离职外部账户（将外部账户置为离职状态）|
|**是否需要认证**|是|

**请求参数（ExternalAccountInvalidCmd）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|accId|String|否|账户id（优先使用）|
|externalId|String|否|外部id（已废弃，使用 accId 代替）|
|externalSource|String|是|外部来源|
|relatedAccountId|String|否|关联账户id(双向对称)|

**响应结果**

返回 `ResultModel<String>`：

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|code|String|响应码（成功为 "0000"）|
|msg|String|响应消息|
|data|String|账户id（accId）|

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误|
|NO_DATA_AVAILABLE|无可用数据|
|THIRD_ERROR|第三方错误|
|UNKNOWN_SYSTEM_ERROR|未知系统异常|

---

### 2.6 返聘外部账户

|   |   |
|---|---|
|属性|值|
|**接口方法**|`com.aliyun.fsi.insurance.sso.api.AccountRpcFacade#rehiredExternalAccount(ExternalAccountRehiredCmd externalAccountRehiredCmd)`|
|**接口描述**|返聘外部账户（将已离职的外部账户重新启用）|
|**是否需要认证**|是|

**请求参数（ExternalAccountRehiredCmd）**

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|accId|String|否|账户Id（优先使用）|
|externalId|String|否|外部id（已废弃，使用 accId 代替）|
|accountStartDt|String|是|入司日期（yyyy-MM-dd）|
|accountEndDt|String|是|离司时间(yyyy-MM-dd)|
|phoneNo|String|是|手机号（11位手机号格式）|
|externalSource|String|是|外部来源|
|relatedAccountId|String|否|关联账户id(双向对称)|

**响应结果**

返回 `ResultModel<String>`：

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|code|String|响应码（成功为 "0000"）|
|msg|String|响应消息|
|data|String|账户id（accId）|

**错误码**

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误|
|NO_DATA_AVAILABLE|无可用数据|
|THIRD_ERROR|第三方错误|
|UNKNOWN_SYSTEM_ERROR|未知系统异常|

---

## 附录

### 公共分页参数 PageQry

|   |   |   |   |
|---|---|---|---|
|参数名|类型|必填|说明|
|pageSize|Integer|是|每页展示条数（范围1-100）|
|pageIndex|Integer|是|当前页码|

### 统一响应结构 ResultModel

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|code|String|响应码（"0000" 表示成功）|
|msg|String|响应消息|
|data|T|响应数据|

### 分页响应结构 PageResultModelSupport

|   |   |   |
|---|---|---|
|参数名|类型|说明|
|code|String|响应码（"0000" 表示成功）|
|msg|String|响应消息|
|data|List<T>|数据列表|
|totalCount|Integer|总记录数|
|pageIndex|Integer|当前页码|
|pageSize|Integer|每页条数|

### 统一错误码 ErrorCode

|   |   |
|---|---|
|错误码|说明|
|PARAMETER_ERROR|参数错误|
|THIRD_ERROR|第三方错误|
|NO_DATA_AVAILABLE|无可用数据|
|UNKNOWN_SYSTEM_ERROR|未知系统异常|
|PHONE_OR_EMAIL_DUPLICATE|手机号或者邮箱重复|

### 接口清单汇总

|   |   |   |   |
|---|---|---|---|
|序号|接口方法|是否需要认证|分类|
|1.1|accountInfo|否|账号查询|
|1.2|accountListByAccountIds|否|账号查询|
|1.3|accountListByBranchOrgCode|否|账号查询|
|1.4|accountListByKeyword|否|账号查询|
|1.5|accountInfoByPhoneNo|否|账号查询|
|1.6|accountInfoByDingUserId|否|账号查询|
|1.7|accountFaceImage|否|账号查询|
|1.8|accountListByAccount|否|账号查询|
|1.9|accountListByLoginTime|否|账号查询|
|2.1|accountListByExternalIds|否|外部账号|
|2.2|accountListByExternalSource|否|外部账号|
|2.3|createExternalAccount|是|外部账号|
|2.4|updateExternalAccount|是|外部账号|
|2.5|invalidExternalAccount|是|外部账号|
|2.6|rehiredExternalAccount|是|外部账号|
