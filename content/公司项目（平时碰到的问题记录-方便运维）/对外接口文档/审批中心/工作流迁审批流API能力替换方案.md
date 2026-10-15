---
publish: true
---

https://cic_irc.yuque.com/tyl581/ggwv9w/fty3imo0w4rfvn3k


如下文档是以老工作流的视角去看审批流的替换方案

## 审批实例

---

##### 发起审批实例（com.aliyun.fsi.insurance.flow.rpc.FlowProcessRpcFacade#startProcessByName）

|   |   |   |
|---|---|---|
|行为|替换接口|含义|
|发起审批|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#start|发起审批流|
|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#activity|查看目前正在运行的任务|

```

        FlowInstanceStartBO flowInstanceStartBO = new FlowInstanceStartBO();
        //流程编码
        flowInstanceStartBO.setFlowCode("M01008212312");
        //流程标题
        flowInstanceStartBO.setFlowInstanceName("xxx发起的销售申请");
        //业务摘要
        flowInstanceStartBO.setDigest("300字之内的审批摘要信息，业务简要");
        //发起人
        flowInstanceStartBO.setCreator("100001501");
        //puid 业务唯一编码，不允许重复
        flowInstanceStartBO.setPuid(PUID.builder().appName("midAboss").businessNum("R240132145267545432").build());
        //启动流程
        ResultModel<String> start = flowInstanceRpcFacade.start(flowInstanceStartBO);
        //流程实例编码
        String flowInstanceId = start.getData();

        FlowActivityQueryBO activityQueryBO = new FlowActivityQueryBO();
        activityQueryBO.setFlowInstanceId(flowInstanceId);
        //目前正在执行中的任务列表
        ResultModel<List<FlowActivityJobResponseDTO>> activity = flowInstanceRpcFacade.activity(activityQueryBO);
```

##### 撤销（com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#withdraw）

|   |   |   |
|---|---|---|
|行为|替换接口|含义|
|撤销|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#withdraw|流程撤销|

##### 流程轨迹（com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#flowPathByBizNo）

|   |   |   |
|---|---|---|
|行为|替换接口|含义|
|流程审批轨迹|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#view|流程审批轨迹|

##### 设置变量（com.aliyun.fsi.insurance.flow.rpc.FlowProcessRpcFacade#setFlowVariables）

能力缺失

##### 流程挂起（com.aliyun.fsi.insurance.flow.rpc.FlowProcessRpcFacade#suspend）

能力缺失

##### 流程激活（com.aliyun.fsi.insurance.flow.rpc.FlowProcessRpcFacade#active）

能力缺失

##### 指定下一节点审批人

能力缺失

## 审批任务

---

##### 任务领取（com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#receive）

审批流已经废弃,任务会自动分配到候选人身上，无需领取。

##### 任务处理（com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#claim）

审批流已经废弃,无需此过程态接口。

##### 任务转交（com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#reassign）

|   |   |   |
|---|---|---|
|行为|替换接口|含义|
|转交|ccom.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#redirect|任务转交给其他处理人|

##### 审批任务确认（com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#complete）

|   |   |   |
|---|---|---|
|行为|替换接口|含义|
|同意|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#agree|同意任务|
|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#activity|查看目前正在运行的任务|
|拒绝|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#reject|拒绝任务|
|退回|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#back|退回任务|
|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#activity|查看目前正在运行的任务|

##### 任务撤回(com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#drawBack)

|   |   |   |
|---|---|---|
|行为|替换接口|含义|
|撤回至上一个节点|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#reCall|任务撤回|
|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#activity|查看目前正在运行的任务|
|撤回至审批人|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#withdraw|流程撤销|

##### 分配任务（com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#assign）

审批流已经废弃，任务会自动分配到候选人身上无需分配。

##### 查询任务信息（com.aliyun.fsi.insurance.flow.rpc.TaskRpcFacade#queryTaskById）

|   |   |   |
|---|---|---|
|行为|替换接口|含义|
|查询任务信息|com.aliyun.fsi.insurance.flow.center.rpc.FlowInstanceRpcFacade#queryJobInstance|查询任务信息|

##### 获取下个节点信息（com.aliyun.fsi.insurance.flow.rpc.FlowProcessRpcFacade#getNextTaskInfo）

能力缺失

## 事件消息监听

---

[https://cic_irc.yuque.com/tyl581/ggwv9w/yg1g3rp2bh64zaws](https://cic_irc.yuque.com/tyl581/ggwv9w/yg1g3rp2bh64zaws)
