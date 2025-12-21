# Matrix AI Testing - 自动化巡检框架

## 📋 Step 注册机制

### 设计理念

**方法级别的步骤注册**：每个测试方法内部包含多个细粒度步骤，每个步骤都单独注册和执行。

**为什么这样设计？**
1. **颗粒度更细**：页面导航、数据查询等都是独立的步骤
2. **进度透明**：通过预执行机制，在实际执行前就知道总步骤数
3. **灵活扩展**：每个方法可以包含任意数量的步骤

### 使用示例

```typescript
@InspectorMethod({
    name: 'NCD一级市场巡检',
    description: '巡检NCD一级市场的数据查询功能',
    keywords: ['ncd', '一级市场'],
    order: 1
})
async inspectNCD(taskId: string, page: Page, fixedScreen: FixedIntegratedScreen): Promise<void> {
    // 步骤1: 页面导航
    await this.step('ncd_navigate', '导航到NCD一级市场', 1).run(async (p) => {
        await fixedScreen.ncd_primary_market();
    }, page);

    // 步骤2: 数据查询
    await this.step('ncd_query', '查询NCD数据', 2).run(async (p) => {
        const ncd_table = await fixedScreen.agent.aiQuery({...});
        console.table(ncd_table);
    }, page);
}
```

### 工作流程

#### 1. 预执行阶段（收集步骤）
```typescript
// Executor 在执行前预调用方法，收集所有步骤注册
inspectorInstance.preExecuteMethod(
    inspectorInstance.inspectNCD,
    'dummy-task-id',
    null, // 不需要真实的page
    null  // 不需要真实的screen
);

// 此时所有 step() 调用只注册不执行
// StepRegistry 中已有: ['ncd_navigate', 'ncd_query']
```

#### 2. 计算总步骤数
```typescript
const inspectorStepsCount = inspectorInstance.getStepRegistry().getTotalSteps(); // 2
const totalSteps = 2 + inspectorStepsCount; // 2(登录+导航) + 2(巡检步骤) = 4
```

#### 3. 创建测试并显示进度
```typescript
// 创建测试时就带上总步骤数
this.stateManager.createTest(taskId, userMessage, totalSteps);

// 卡片一开始就显示: "Step 0/4"
```

#### 4. 真实执行阶段
```typescript
// 设置当前任务ID
inspectorInstance.setCurrentTaskId(taskId);

// 真实执行方法
await inspectorInstance.inspectNCD(taskId, page, screen);

// 此时每个 step().run() 都会：
// 1. 添加步骤到 TestStateManager
// 2. 执行实际的业务逻辑
// 3. 截图并更新状态
// 4. 卡片实时显示: "Step 1/4" -> "Step 2/4" -> ...
```

### 核心API

#### `step(stepId, name, order?)`
注册一个步骤并返回 `StepBuilder`

**参数**:
- `stepId`: 步骤唯一标识符
- `name`: 步骤显示名称
- `order`: 可选，执行顺序

**返回**: `StepBuilder` 对象，可调用 `.run()`

#### `run(implementation, page)`
执行步骤的实际逻辑

**参数**:
- `implementation`: `async (page: Page) => Promise<void>` - 步骤的实现逻辑
- `page`: Playwright 的 Page 对象

**行为**:
- 预执行模式：只注册，不执行 `implementation`
- 真实执行模式：执行 `implementation`，截图，更新状态

### 完整示例

```typescript
export class FixedIntegratedScreenInspector extends BaseInspector {
    @InspectorMethod({...})
    async inspectGlobalBonds(taskId: string, page: Page, screen: FixedIntegratedScreen): Promise<void> {
        // 步骤1: 导航
        await this.step('bonds_nav', '导航到全球国债', 1).run(async (p) => {
            await screen.global_government_bonds();
        }, page);

        // 步骤2: 查询
        await this.step('bonds_query', '查询国债数据', 2).run(async (p) => {
            const data = await screen.agent.aiQuery([...]);
            console.table(data);
        }, page);

        // 可以有更多步骤...
    }
}
```

### 优势

✅ **精确进度**：从一开始就显示正确的总步骤数  
✅ **细粒度高**：每个操作（导航、查询）都是独立的步骤  
✅ **灵活性**：方法内可以包含任意数量的步骤  
✅ **失败定位**：每个步骤都有截图，失败时精确定位问题  
✅ **代码清晰**：每个步骤都有明确的名称和边界