---
publish: true
---

https://cic_irc.yuque.com/tyl581/ggwv9w/kagqtg3hywkhqmmo
## **一、pom坐标**

```
<dependency>
    <groupId>com.aliyun.fsi.insurance</groupId>
    <artifactId>aboss-property-hrms-facade</artifactId>
    <version>1.0.2-SNAPSHOT</version>
</dependency>
```

## 二、账户变更MQ

TOPIC：TP_CIC_MIDABOSS_HRMS_OUTSOURCED_STAFF

TAG：TG_CIC_MIDABOSS_HRMS_OUTSOURCED_STAFF

报文体：com.aliyunfsi.insurance.hrms.facade.event.OutsourcedStaffEvent

  

```


    /**
     * 员工id
     */
    private String staffId;
    /**
     * 账号
     */
    private String accountId;
    /**
     * 显示名称
     */
    private String displayName;
    /**
     * 手机号
     */
    private String phone;
    /**
     * 归属组织编码
     */
    private String branchOrgCode;
    /**
     * 归属组织名称
     */
    private String branchOrgName;
    /**
     * 归属经营组织编码
     */
    private String operatingOrgCode;

    /**
     * 归属经营组织名称
     */
    private String operatingOrgName;

    /**
     * 关联协议ID
     */
    private String agreementNo;

    /**
     * 协议名称
     */
    private String agreementName;

    /**
     * 业务线
     */
    private String businessLineCode;

    /**
     * 业务线名称
     */
    private String businessLineName;

    /**
     * 工作岗位
     */
    private String workPositionCode;

    /**
     * 工作岗位名称
     */
    private String workPositionName;

    /**
     * 标准岗位
     */
    private String standardPositionCode;

    /**
     * 标准岗位名称
     */
    private String standardPositionName;

    /**
     * 供应商
     */
    private String supplierId;

    /**
     * 供应商名称
     */
    private String supplierName;

    /**
     * 在职状态
     * "-3", "入场审批中"
     * "-2", "审批通过待入场"
     * "-1", "待入场"
     * "0", "已入场"
     * "1", "已离场"
     * "2", "离场审批中"
     * "3", "审批通过待离场"
     */
    private String staffStatus;
    /**
     * 证件类型
     */
    private String certificateType;
    /**
     * 证件号码
     */
    private String certificateNumber;
    /**
     * 性别
     */
    private String gender;
    /**
     * 出生日期
     */
    private String birthDate;
    /**
     * 最高学历
     */
    private String education;

    /**
     * 政治面貌
     */
    private String politicalStatus;

    /**
     * 项目id
     */
    private String projectCode;

    /**
     * 项目名称
     */
    private String projectName;

    /**
     * 协议归属组织编码
     */
    private String agreementBranchOrgCode;

    /**
     * 协议归属组织名称
     */
    private String agreementBranchOrgName;

    /**
     * 入场日期
     */
    private Date onboardDate;


    /**
     * 离场日期
     */
    private Date offboardDate;

    /**
     * 是否自动授权
     */
    private Integer autoAuthorize;

    /**
     * 工作岗位分类(Digital_Sales_Professional_Level_cd一级)
     */
    private String positionClassification;

    /**
     * 专业层次(Digital_Sales_Professional_Level_cd二级)
     */
    private String professionalGrade;

    /**
     * 业务分类
     */
    private String businessCategory;
    /**
     * 年龄
     */
    private Integer age;

    /**
     * 民族
     */
    private String ethnic;

    /**
     * 户口类型
     */
    private String household;

    /**
     * 开始工作时间
     */
    private String workStartDate;

    /**
     * 邮箱
     */
    private String email;

    /**
     * 最高学历学制
     */
    private String highestEducation;

    /**
     * 所学专业
     */
    private String major;

    /**
     * 最高学位
     */
    private String highestDegree;

    /**
     * 通讯地址
     */
    private String mailingAddress;

    /**
     * 照片
     */
    private String picture;

    /**
     * 工作所在地
     */
    private String workLocation;
    /**
     * 工作所在地名称
     */
    private String workLocationName;

    /**
     * 用工类型
     */
    private String employmentCategory;

    /**
     * 区域名称
     */
    private String regionName;

     /**
      * 关联内部账号id
      */
    private String relatedAccountId;
    /**
     * 账号创建人
     */
    private String creater;

}
```
