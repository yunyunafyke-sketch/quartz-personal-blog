---
title: 如何使用@Async
date: 2026-11-04 11:30:42
publish: true
---


## 一、怎么实现

项目的做法是：**开启异步支持，配置线程池，再给后台方法加上 `@Async`。** 调用时，Spring 把这次方法调用交给指定线程池安排执行。

### 1.1 开启支持、配置线程池

配置在 `AsyncConfig.java`，主要看这几处：

```java
@EnableAsync  
@Configuration  
public class AsyncConfig implements AsyncConfigurer {  
  
    /**  
     * 创建线程池  
     * @return  
     */  
    @Override  
    @Bean("taskExecutor")  
    public Executor getAsyncExecutor() {  
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();  
        // 核心线程数 - 根据CPU核心数和任务类型调整  
        executor.setCorePoolSize(5);  
        // 最大线程数  
        executor.setMaxPoolSize(10);  
        // 队列容量  
        executor.setQueueCapacity(100);  
        // 线程前缀  
        executor.setThreadNamePrefix("Async-Executor-");  
        // 拒绝策略  
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());  
        // 等待所有任务完成再关闭  
        executor.setWaitForTasksToCompleteOnShutdown(true);  
        // 关闭前等待时间  
        executor.setAwaitTerminationSeconds(30);  
        // 使用自定义的TaskDecorator来传递上下文  
        executor.setTaskDecorator(new ContextCopyingDecorator());  
        executor.initialize();  
        return executor;  
    }  
}
```

`getAsyncExecutor()` 创建了 `ThreadPoolTaskExecutor`，名字是 `taskExecutor`，核心线程数为 **5**、最大线程数为 **10**、队列容量为 **100**，线程名前缀为 `Async-Executor-`。

### 1.2 标记后台方法

比如码表导出，注解写在 `BasicCodesExportExe.execute` 上：

```java
// 原方法结构节选，业务实现省略。
// taskExecutor 是配置类注册的 Bean 名，表示把任务交给这个执行器。
@Async("taskExecutor")
public void execute(BasicCodesExportCmd basicCodesExportCmd) {
    // 查询码表码值、整理数据、上传文件、更新操作状态。
}
```

### 1.3 通过注入对象调用

`CodeFacadeImpl` 注入 `BasicCodesExportExe`，再调用它：

```java
// 原类中的字段：对象交给 Spring 管理，不是自己 new 出来的。
@Resource
private BasicCodesExportExe basicCodesExportExe;
```

```java
// exportCodes 方法内的调用节选，参数来自本次导出请求。
basicCodesExportExe.execute(basicCodesExportCmd);
// 正常提交后，当前请求继续设置返回值，不必等文件生成完成。
resultModel.setData(true);
resultModel.setStatus(Status.S.getValue());
```

看起来还是普通方法调用，但 Spring 会先经过一个代理，把任务提交给 `taskExecutor`，由它安排执行。默认代理模式下，同一个对象内部用 `this.execute(...)` 调用自己，通常不会触发异步。

**异步决定调用方是否需要等业务做完；线程池负责安排线程、限制数量和排队。** 在项目中，它们通过 `@Async("taskExecutor")` 连在一起。

## 二、哪些地方用了

当前代码里，以下方法都标记了 `@Async("taskExecutor")`：

| 位置 | 用途 |
| --- | --- |
| `BasicCodesExportExe.execute` | 码表码值导出 |
| `ExportAreasDataExe.execute` | 地区数据导出 |
| `ImportAreasDataExe.execute` | 地区数据导入 |
| `SyncCodesCacheByTypesExe.execute` | 按类型刷新缓存 |
| `SyncAssociationCodeCacheExe.execute` | 刷新关联关系缓存 |
| `AreaCodeGatewayImpl.importAreaPreviewData` | 解析地区导入文件、处理预览数据 |
| `BasicAreaPreviewGatewayImpl.deleteByFileId` | 按文件清理地区预览数据、更新操作状态 |
| `CodeAssociationGatewayImpl.exportAssociationData` | 关联关系导出 |
| `CodeAssociationGatewayImpl.createImportPreviewData` | 生成关联关系导入预览 |
| `CodeAssociationGatewayImpl.importAssociationData` | 关联关系导入 |
| `CodeAssociationGatewayImpl.confirmImportRelationshipData` | 确认导入关联关系 |

它们指定的是**同一个业务线程池**，任务多时会争用这组线程。上游的 `queryBatch` 查询没有因此自动变成异步调用。

## 三、导出流程
以码表码值导出为例，入口是 `CodeFacadeImpl.exportCodes`，真正干活的是 `BasicCodesExportExe.execute`。

**1. 进入后台方法，创建操作记录**

```java
@Async("taskExecutor")
public void execute(BasicCodesExportCmd basicCodesExportCmd) {
```
这次导出由 `taskExecutor` 安排执行。进入方法后，先创建操作记录（这里会记录谁发起的、导出哪些类型、当前状态是什么。）：
```java
OperationHistoryDO operationHistoryDO = new OperationHistoryDO()
    .setOperationId(IdUtil.getSnowflake(1, 1).nextId())
    .setBasicCodeStatus(StatusEnum.ANALYZING.getCode())
    .setErrorMsg(StatusEnum.ANALYZING.getDesc())
    .setCreator(accountId())
    .setOperationType(Short.valueOf(OperationType.CODE_EXPORT.getCode()))
    .setRemark(JSON.toJSONString(basicCodesExportCmd.getTypes()));

// 写入一条“正在处理”的导出记录。
basicOperationMapper.insert(operationHistoryDO);
```

**2. 查询码表信息和全部码值** **（这里没有分页，也没有每次只取多少条的限制。符合条件的数据越多，这个列表就越大。）**
```java
// 查询用户选中的码表类型，后面要用其中的归属域。
List<BasicType> basicTypes = basicTypeGateway.queryBy(
    null, basicCodesExportCmd.getTypes(), null, null);

// 查询这些类型下的全部有效码值。
List<BasicCodeDO> basicCodeDOS = basicCodeMapper.selectList(
    Wrappers.lambdaQuery(BasicCodeDO.class)
        .in(BasicCodeDO::getTypeCode, basicCodesExportCmd.getTypes())
        .eq(BasicCodeDO::getIsValid, VALID));

```


**3. 转换成 Excel 需要的对象**（这一步会创建新的列表和导出对象。**所以不是从数据库读一条就写一条，而是先准备好整份导出数据。**）
```java
List<CodeModel> codeModels =
    BasicCodeConvertor.INSTANCE.toCodeModelS(basicCodeDOS);
    
    
    
//然后补上归属域
codeModels.stream().forEach(codeModel -> {
    basicTypes.stream().forEach(basicType -> {
        // 根据类型找到对应码表，将归属域填进导出对象。
        if (StringUtils.equals(basicType.getTypeCode(), codeModel.getType())) {
            codeModel.setTypeFrom(basicType.getTypeFrom());
        }
    });
});
```

**4. 将整份列表交给文件服务**

```java
UploadFile callBack = externalFileServiceGateway.uploadList(
    codeModels,
    basicCodesExportCmd.getServiceCode(),
    null,
    fileName,
    CodeModel.class);
```

`uploadList` 内部先调用 `createWriteFileItem` 生成 Excel，核心代码是：

```java
// 文件内容超过 16 字节后转存到临时文件，避免完整文件一直保留在堆中。
FileItemFactory factory = new DiskFileItemFactory(16, null);
FileItem item = factory.createItem(fileName, "text/csv", true, fileName);

// 根据 CodeModel 的列定义，把整个列表写入 Excel。
EasyExcel.write(item.getOutputStream(), classes)
    .sheet("Sheet1")
    .doWrite(list);
```


虽然这里创建文件项时写的是 `text/csv`，实际内容是通过 EasyExcel 生成的 Excel。

**临时文件可以减少文件内容的内存占用，但前面准备的全量 Java 对象列表已经存在了。**


**5. 上传成功，更新操作记录**

```java
operationHistoryDO
    .setFileId(callBack.getFileId())
    .setFileName(fileName)
    .setErrorMsg(StatusEnum.SUCCESS.getDesc())
    .setBasicCodeStatus(StatusEnum.SUCCESS.getCode());

// 根据本次操作 ID 更新对应记录。
basicOperationMapper.update(
    operationHistoryDO,
    Wrappers.<OperationHistoryDO>lambdaUpdate()
        .eq(OperationHistoryDO::getOperationId,
            operationHistoryDO.getOperationId()));
```


把当前代码连起来就是：
```
数据库里的全部符合条件的码值
    ↓ 一次查询
List<BasicCodeDO>
    ↓ 全量转换
List<CodeModel>
    ↓ 补充归属域
EasyExcel 写入临时文件
    ↓
调用文件中心上传
    ↓
保存文件信息、更新导出状态
```