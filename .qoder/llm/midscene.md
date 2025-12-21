---
url: /zh/android-api-reference.md
---

# API 参考（Android）

当你需要自定义设备行为、把 Midscene 接入框架，或排查 adb 问题时，请查阅本节。关于通用构造函数（报告、Hook、缓存等）的参数说明，请参考平台无关的 [API 参考](./api)。

## Action Space（动作空间）

`AndroidDevice` 使用以下动作空间，Midscene Agent 在规划任务时可以使用这些操作：

- `Tap` —— 点击元素。
- `DoubleClick` —— 双击元素。
- `Input` —— 输入文本，支持 `replace`/`append`/`clear` 模式，可选 `autoDismissKeyboard`。
- `Scroll` —— 以元素为起点或从屏幕中央向上/下/左/右滚动，支持滚动到顶/底/左/右。
- `DragAndDrop` —— 从一个元素拖拽到另一个元素。
- `KeyboardPress` —— 按下指定键位。
- `AndroidLongPress` —— 长按目标元素，可选自定义时长。
- `AndroidPull` —— 上拉或下拉（如下拉刷新），可选距离与持续时间。
- `ClearInput` —— 清空输入框内容。
- `Launch` —— 打开网页或 `package/.Activity`。
- `RunAdbShell` —— 执行原始 `adb shell` 命令。
- `AndroidBackButton` —— 触发系统返回。
- `AndroidHomeButton` —— 回到桌面。
- `AndroidRecentAppsButton` —— 打开多任务/最近应用。

## AndroidDevice {#androiddevice}

创建一个可供 AndroidAgent 驱动的 adb 设备实例。

### 导入

```ts
import { AndroidDevice, getConnectedDevices } from '@midscene/android';
```

### 构造函数

```ts
const device = new AndroidDevice(deviceId, {
  // 设备参数...
});
```

### 设备选项

- `deviceId: string` —— 来自 `adb devices` 或 `getConnectedDevices()` 的值。
- `autoDismissKeyboard?: boolean` —— 输入完成后自动隐藏键盘，默认 `true`。
- `keyboardDismissStrategy?: 'esc-first' | 'back-first'` —— 关闭键盘的顺序，默认 `'esc-first'`。
- `androidAdbPath?: string` —— adb 可执行文件的自定义路径。
- `remoteAdbHost?: string` / `remoteAdbPort?: number` —— 指向远程 adb server。
- `imeStrategy?: 'always-yadb' | 'yadb-for-non-ascii'` —— 控制何时调用 [yadb](https://github.com/ysbing/YADB) 进行文本输入，默认 `'yadb-for-non-ascii'`。
- `displayId?: number` —— 在设备镜像多个屏幕时，选择特定虚拟屏幕。
- `screenshotResizeScale?: number` —— 在发送给模型前对截图进行缩放，默认 `1 / devicePixelRatio`。
- `alwaysRefreshScreenInfo?: boolean` —— 每一步都重新查询旋转角度与屏幕尺寸，默认 `false`。

### 使用说明

- 可以使用 `getConnectedDevices()` 发现设备，`udid` 与 `adb devices` 输出一致。
- 可以使用 `remoteAdbHost/remoteAdbPort` 连接远程 adb；如果 adb 不在 PATH 中，可设置 `androidAdbPath`。

### 示例

#### 快速开始

```ts
import { AndroidAgent, AndroidDevice, getConnectedDevices } from '@midscene/android';

const [first] = await getConnectedDevices();
const device = new AndroidDevice(first.udid);
await device.connect();

const agent = new AndroidAgent(device, {
  aiActionContext: 'If a permissions dialog appears, accept it.',
});

await agent.launch('https://www.ebay.com');
await agent.aiAct('search "Headphones" and wait for results');
const items = await agent.aiQuery(
  '{itemTitle: string, price: number}[], find item in list and corresponding price',
);
console.log(items);
```

#### 启动原生 App

```ts
await agent.launch('com.android.settings/.Settings');
await agent.back();
await agent.home();
```

## AndroidAgent {#androidagent}

将 Midscene 的 AI 规划能力绑定到 AndroidDevice，实现 UI 自动化。

### 导入

```ts
import { AndroidAgent } from '@midscene/android';
```

### 构造函数

```ts
const agent = new AndroidAgent(device, {
  // 通用 Agent 参数...
});
```

### Android 特有选项

- `customActions?: DeviceAction[]` —— 通过 `defineAction` 扩展规划器的可用动作。
- 其余字段与 [API constructors](./api#common-parameters) 一致：`generateReport`、`reportFileName`、`aiActionContext`、`modelConfig`、`cacheId`、`createOpenAIClient`、`onTaskStartTip` 等。

### 使用说明

:::info

- 一个设备连接对应一个 Agent。
- `launch`、`runAdbShell` 等 Android 专属辅助函数也可在 YAML 脚本中使用，语法见 [Android 平台特定动作](./automate-with-scripts-in-yaml#the-android-part)。
- 通用交互方法请查阅 [API 参考（通用）](./api#interaction-methods)。

:::

### Android 特有方法

#### `agent.launch()`

启动网页或原生 Android activity/package。

```ts
function launch(uri: string): Promise<void>;
```

- `uri: string` —— 可以是网页 URL，也可以是 `package/.Activity` 形式的字符串，例如 `com.android.settings/.Settings`。

#### `agent.runAdbShell()`

通过连接的设备运行原始的 `adb shell` 命令。

```ts
function runAdbShell(command: string): Promise<string>;
```

- `command: string` —— 原样传递给 `adb shell` 的命令。

```ts
const result = await agent.runAdbShell('dumpsys battery');
console.log(result);
```

#### 导航辅助

- `agent.back(): Promise<void>` —— 触发 Android 系统的返回操作。
- `agent.home(): Promise<void>` —— 返回桌面。
- `agent.recentApps(): Promise<void>` —— 打开多任务/最近应用界面。

### 辅助工具

#### `agentFromAdbDevice()`

从任意已连接的 adb 设备创建 `AndroidAgent`。

```ts
function agentFromAdbDevice(
  deviceId?: string,
  opts?: PageAgentOpt & AndroidDeviceOpt,
): Promise<AndroidAgent>;
```

- `deviceId?: string` —— 连接特定设备；留空表示使用“第一个可用设备”。
- `opts?: PageAgentOpt & AndroidDeviceOpt` —— 在一个对象中合并 Agent 选项与 [`AndroidDevice`](#androiddevice) 的设置。

#### `getConnectedDevices()`

列举 Midscene 可驱动的 adb 设备。

```ts
function getConnectedDevices(): Promise<Array<{
  udid: string;
  state: string;
  port?: number;
}>>;
```

### 相关阅读

- [Android 快速开始](./android-getting-started) 获取搭建与脚本示例。



---
url: /zh/android-getting-started.md
---




import { PackageManagerTabs } from '@theme';

# Android 开始使用

本指南将带你完成使用 Midscene 自动化 Android 设备所需的一切：通过 adb 连接真机、配置模型 API Key、体验零代码 Playground，并运行你的首个 JavaScript 脚本。

:::info 示例项目

使用 JavaScript 控制 Android 设备：[https://github.com/web-infra-dev/midscene-example/blob/main/android/javascript-sdk-demo](https://github.com/web-infra-dev/midscene-example/blob/main/android/javascript-sdk-demo)

集成 Vitest 进行测试：[https://github.com/web-infra-dev/midscene-example/tree/main/android/vitest-demo](https://github.com/web-infra-dev/midscene-example/tree/main/android/vitest-demo)

:::

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


## 准备工作

在编写脚本前，先确认 adb 能够连接设备且设备信任当前电脑。

### 安装 adb 并设置 `ANDROID_HOME`

- 通过 [Android Studio](https://developer.android.com/studio) 或 [命令行工具](https://developer.android.com/studio#command-line-tools-only) 安装 adb
- 验证安装是否成功：

```bash
adb --version
```

出现类似输出表示安装成功：

```log
Android Debug Bridge version 1.0.41
Version 34.0.4-10411341
Installed as /usr/local/bin//adb
Running on Darwin 24.3.0 (arm64)
```

- 按 [Android environment variables](https://developer.android.com/tools/variables) 设置 `ANDROID_HOME`，并验证：

```bash
echo $ANDROID_HOME
```

有输出即代表配置成功：

```log
/Users/your_username/Library/Android/sdk
```

### 启用 USB 调试并验证设备

在系统设置的开发者选项中开启 **USB 调试**（若有 **USB 调试（安全设置）** 也请一并开启），然后用数据线连接手机。

<p align="center">
  <img src="/android-usb-debug-en.png" alt="android usb debug" width="400"/>
</p>

验证连接：

```bash
adb devices -l
```

出现类似输出代表连接成功：

```log
List of devices attached
s4ey59	device usb:34603008X product:cezanne model:M2006J device:cezan transport_id:3
```

## 试用 Playground（零代码）

Playground 是验证连接、观察 AI Agent 的最快方式，无需编写代码。它与 `@midscene/android` 共享相同的代码实现，因此在 Playground 上验证通过的流程，用脚本运行时也完全一致。

![](/android-playground.png)

1. 启动 Playground CLI：

```bash
npx --yes @midscene/android-playground
```

2. 点击 Playground 窗口中的齿轮按钮，粘贴你的 API Key 配置。如果还没有 API Key，请回到 [模型配置](./model-config) 获取。

![](/android-set-env.png)

### 开始体验

配置完成后，你可以立即开始体验 Midscene。它提供了多个关键操作 Tab：

- **Act**: 与网页进行交互，这就是自动规划（Auto Planning），对应于 `aiAct` 方法。比如
```
在搜索框中输入 Midscene，执行搜索，跳转到第一条结果
```

```
填写完整的注册表单，注意主要让所有字段通过校验
```

- **Query**: 从界面中提取 JSON 结构的数据，对应于 `aiQuery` 方法。

类似的方法还有 `aiBoolean()`, `aiNumber()`, `aiString()`，用于直接提取布尔值、数字和字符串。

```
提取页面中的用户 ID，返回 { id: string } 结构的 JSON 数据
```


- **Assert**: 理解页面，进行断言，如果不满足则抛出错误，对应于 `aiAssert` 方法。

```
页面上存在一个登录按钮，它的下方有一个用户协议的链接
```

- **Tap**: 在某个元素上点击，这就是即时操作（Instant Action），对应于 `aiTap` 方法。
```
点击登录按钮
```

> 关于自动规划（Auto Planning）和即时操作（Instant Action）的区别，请参考 [API](../api.mdx) 文档。


## 集成 Midscene Agent

当 Playground 运行正常后，就可以切换到可复用的 JavaScript 脚本。

### 第 1 步：安装依赖

<PackageManagerTabs command="install @midscene/android --save-dev" />

### 第 2 步：编写脚本

下面的示例会在设备上打开浏览器、搜索 eBay，并断言结果列表。

```typescript title="./demo.ts"
import {
  AndroidAgent,
  AndroidDevice,
  getConnectedDevices,
} from '@midscene/android';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
Promise.resolve(
  (async () => {
    const devices = await getConnectedDevices();
    const device = new AndroidDevice(devices[0].udid);

    const agent = new AndroidAgent(device, {
      aiActionContext:
        'If any location, permission, user agreement, etc. popup, click agree. If login page pops up, close it.',
    });
    await device.connect();

    await agent.aiAct('open browser and navigate to ebay.com');
    await sleep(5000);
    await agent.aiAct('type "Headphones" in search box, hit Enter');
    await agent.aiWaitFor('There is at least one headphone product');

    const items = await agent.aiQuery(
      '{itemTitle: string, price: Number}[], find item in list and corresponding price',
    );
    console.log('headphones in stock', items);

    await agent.aiAssert('There is a category filter on the left');
  })(),
);
```

### 第 3 步：运行示例

```bash
npx tsx demo.ts
```

### 第 4 步：查看报告

脚本成功后会输出 `Midscene - report file updated: /path/to/report/some_id.html`。在浏览器中打开该 HTML 文件即可回放每一步交互、查询与断言。

## 进阶

当你需要自定义设备行为、把 Midscene 接入独立框架，或排查 adb 问题时，可参考本节内容。更多构造函数参数可前往 [API 参考（Android）](./android-api-reference)。

### 扩展 Android 上的 Midscene

使用 `defineAction()` 定义自定义手势，并通过 `customActions` 传入。Midscene 会把自定义动作追加到规划器中，让 AI 可以调用你领域特定的动作名。

```typescript
import { getMidsceneLocationSchema, z } from '@midscene/core';
import { defineAction } from '@midscene/core/device';
import { AndroidAgent, AndroidDevice, getConnectedDevices } from '@midscene/android';

const ContinuousClick = defineAction({
  name: 'continuousClick',
  description: 'Click the same target repeatedly',
  paramSchema: z.object({
    locate: getMidsceneLocationSchema(),
    count: z.number().int().positive().describe('How many times to click'),
  }),
  async call(param) {
    const { locate, count } = param;
    console.log('click target center', locate.center);
    console.log('click count', count);
  },
});

const devices = await getConnectedDevices();
const device = new AndroidDevice(devices[0].udid);
await device.connect();

const agent = new AndroidAgent(device, {
  customActions: [ContinuousClick],
});

await agent.aiAct('click the red button five times');
```

关于自定义动作和动作 Schema 的更多解释，请参阅 [与任意界面集成](./integrate-with-any-interface#define-a-custom-action)。

## 更多

- 查看所有 Agent 方法：[API 参考（通用）](./api#interaction-methods)
- Android 专属参数与接口：[Android Agent API](./android-api-reference)
- 示例项目
    - Android JavaScript SDK 示例：[https://github.com/web-infra-dev/midscene-example/blob/main/android/javascript-sdk-demo](https://github.com/web-infra-dev/midscene-example/blob/main/android/javascript-sdk-demo)
    - Android + Vitest 示例：[https://github.com/web-infra-dev/midscene-example/tree/main/android/vitest-demo](https://github.com/web-infra-dev/midscene-example/tree/main/android/vitest-demo)



---
url: /zh/android-introduction.md
---

# Android 自动化支持

Midscene 可以驱动 adb 工具来实现 Android 自动化。

由于适配了视觉模型方案，整个自动化过程可以适配任意的 App 技术栈，无论是 Native、Flutter 还是 React Native 构建的 App 或小程序都能使用。开发者只需面向最终效果调试 UI 自动化脚本即可。

Android UI 自动化解决方案具备 Midscene 的全部特性：

- 支持使用 Playground 进行零代码试用。
- 支持 JavaScript SDK。
- 支持使用 YAML 格式的自动化脚本和命令行工具。
- 支持生成 HTML 报告来回放所有操作路径。

## 案例展示

### 地图导航到景点

打开地图 App，搜索目的地，然后发起导航。

<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/android-maps.mp4" controls/>

### Twitter 自动点赞

打开 Twitter，自动点赞 [@midscene_ai](https://x.com/midscene_ai) 的第一条推文。

<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/android-twitter.mp4" controls/>

## 在 Android 上试用 Midscene Playground

借助 Midscene.js Playground，你无需编写任何代码就能体验 Android 自动化能力。

![](/android-playground.png)

## 下一步

* [快速开始](./android-getting-started)
* [使用 JavaScript SDK](./android-getting-started)
* [使用 YAML 格式的自动化脚本](./automate-with-scripts-in-yaml) 与 [命令行工具](./automate-with-scripts-in-yaml)



---
url: /zh/api.md
---

# API 参考（公共部分）

## 构造器

Midscene 针对每个不同环境都有对应的 Agent。每个 Agent 的构造函数都接受一组共享的配置项（设备、报告、缓存、AI 配置、钩子等），然后再叠加平台专属的配置，比如浏览器里的导航控制或 Android 的 ADB 配置。

你可以通过下面的链接查看各 Agent 的导入路径和平台专属参数：

- 在 Puppeteer 中，使用 [PuppeteerAgent](./web-api-reference#puppeteer-agent)
- 在 Playwright 中，使用 [PlaywrightAgent](./web-api-reference#playwright-agent)
- 在桥接模式（Bridge Mode）中，使用 [AgentOverChromeBridge](./web-api-reference#chrome-bridge-agent)
- 在 Android 中，使用 [Android API 参考](./android-api-reference)
- 在 iOS 中，使用 [iOS API 参考](./ios-api-reference)
- 如果你要把 GUI Agent 集成到自己的界面，请参考 [自定义界面 Agent](#custom-interface-agent)

### 参数

这些 Agent 有一些相同的构造参数：

- `generateReport: boolean`: 如果为 true，则生成报告文件。默认值为 true。
- `reportFileName: string`: 报告文件的名称，默认值由 midscene 内部生成。
- `autoPrintReportMsg: boolean`: 如果为 true，则打印报告消息。默认值为 true。
- `cacheId: string | undefined`: 如果配置，则使用此 cacheId 保存或匹配缓存。默认值为 undefined，也就是不启用缓存。
- `aiActContext: string`: 调用 `agent.aiAct()` 时，发送给 AI 模型的背景知识，比如 "有 cookie 对话框时先关闭它"，默认值为空。此前名为 `aiActionContext`，旧名称仍然兼容。
- `replanningCycleLimit: number`: `aiAct` 的最大重规划次数。默认值为 20（UI-TARS 模型默认 40）。推荐通过 agent 入参设置；`MIDSCENE_REPLANNING_CYCLE_LIMIT` 环境变量仅作兼容读取。
- `onTaskStartTip: (tip: string) => void | Promise<void>`：可选回调，在每个子任务执行开始前收到一条可读的任务描述提示。默认值为 undefined。

### 自定义模型

`modelConfig: Record<string, string | number>` 可选。它允许你通过代码配置模型，而不是通过环境变量。

> 如果在 Agent 初始化时提供了 `modelConfig`，**系统环境变量中的模型配置将全部被忽略**，仅使用该对象中的值。
> 这里可配置的 key / value 与 [模型配置](./model-config) 文档中说明的内容完全一致。你也可以参考 [模型策略](./model-strategy) 中的说明。

**基础示例（所有意图共用同一模型）：**
```typescript
const agent = new PuppeteerAgent(page, {
  modelConfig: {
    MIDSCENE_MODEL_NAME: 'qwen3-vl-plus',
    MIDSCENE_MODEL_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    MIDSCENE_MODEL_API_KEY: 'sk-...',
    MIDSCENE_MODEL_FAMILY: 'qwen3-vl'
  }
});
```

**为不同任务类型配置不同模型（使用针对意图的环境变量键）：**
```typescript
const agent = new PuppeteerAgent(page, {
  modelConfig: {
    // 默认
    MIDSCENE_MODEL_NAME: 'qwen3-vl-plus',
    MIDSCENE_MODEL_API_KEY: 'sk-default-key',
    MIDSCENE_MODEL_BASE_URL: '.....',
    MIDSCENE_MODEL_FAMILY: 'qwen3-vl',

    // planning 意图
    MIDSCENE_PLANNING_MODEL_NAME: 'gpt-5.1',
    MIDSCENE_PLANNING_MODEL_API_KEY: 'sk-planning-key',
    MIDSCENE_PLANNING_MODEL_BASE_URL: '...',

    // insight 意图
    MIDSCENE_INSIGHT_MODEL_NAME: 'qwen-vl-plus',
    MIDSCENE_INSIGHT_MODEL_API_KEY: 'sk-insight-key'
  }
});
```

### 自定义 OpenAI 客户端

`createOpenAIClient: (openai, options) => Promise<OpenAI | undefined>` 可选。它允许你包装 OpenAI 客户端实例，用于集成可观测性工具（如 LangSmith、LangFuse）或应用自定义中间件。

**参数说明：**
- `openai: OpenAI` - Midscene 创建的基础 OpenAI 客户端实例，已包含所有必要配置（API 密钥、基础 URL、代理等）
- `options: Record<string, unknown>` - OpenAI 初始化选项，包括：
    - `baseURL?: string` - API 接入地址
    - `apiKey?: string` - API 密钥
    - `dangerouslyAllowBrowser: boolean` - 在 Midscene 中始终为 true
    - 其他 OpenAI 配置选项

**返回值：**
- 返回包装后的 OpenAI 客户端实例，或返回 `undefined` 表示使用原始实例

**示例（集成 LangSmith）：**
```typescript
import { wrapOpenAI } from 'langsmith/wrappers';

const agent = new PuppeteerAgent(page, {
  createOpenAIClient: async (openai, options) => {
    // 为规划任务包装 LangSmith
    if (options.baseURL?.includes('planning')) {
      return wrapOpenAI(openai, {
        metadata: { task: 'planning' }
      });
    }

    // 其他任务返回原始客户端
    return openai;
  }
});
```

**注意：** 对于 LangSmith 和 Langfuse 集成，推荐使用 [模型配置](./model-config#使用-langsmith) 中介绍的环境变量方式，无需编写 `createOpenAIClient` 代码。如果你提供了自定义的客户端包装函数，它会覆盖环境变量的自动集成行为。

## 交互方法

这些是 Midscene 中各类 Agent 的主要 API。

:::info 自动规划 v.s. 即时操作

在 Midscene 中，你可以选择使用自动规划（Auto Planning）或即时操作（Instant Action）。

- `agent.ai()` 是自动规划（Auto Planning）：Midscene 会自动规划操作步骤并执行。它更智能，更像流行的 AI Agent 风格，但可能较慢，且效果依赖于 AI 模型的质量。
- `agent.aiTap()`, `agent.aiHover()`, `agent.aiInput()`, `agent.aiKeyboardPress()`, `agent.aiScroll()`, `agent.aiDoubleClick()`, `agent.aiRightClick()` 是即时操作（Instant Action）：Midscene 会直接执行指定的操作，而 AI 模型只负责底层任务，如定位元素等。这种接口形式更快、更可靠。当你完全确定自己想要执行的操作时，推荐使用这种接口形式。

:::

### `agent.aiAct()` 或 `.ai()`

这个方法允许你通过自然语言描述一系列 UI 操作步骤。Midscene 会自动规划这些步骤并执行。

:::info 向后兼容

这个接口在之前版本里也被写为 `aiAction()`，当前的版本兼容两种写法。为了保持代码的一致性，建议使用新的 `aiAct()` 方法。

:::

- 类型

```typescript
function aiAct(
  prompt: string,
  options?: {
    cacheable?: boolean;
  },
): Promise<void>;
function ai(prompt: string): Promise<void>; // 简写形式
```

- 参数：

    - `prompt: string` - 用自然语言描述的操作内容
    - `options?: Object` - 可选，一个配置对象，包含：
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true

- 返回值：

    - 返回一个 Promise。当所有步骤执行完成时解析为 void；若执行失败，则抛出错误。

- 示例：

```typescript
// 基本用法
await agent.aiAct('在搜索框中输入 "JavaScript"，然后点击搜索按钮');

// 使用 .ai 简写形式
await agent.ai(
  '点击页面顶部的登录按钮，然后在用户名输入框中输入 "test@example.com"',
);

// 使用 ui-tars 模型时，可以使用更目标驱动的提示词
await agent.aiAct('发布一条微博，内容为 "Hello World"');
```

:::tip

在实际运行时，Midscene 会将用户指令规划（Planning）成多个步骤，然后逐步执行。如果 Midscene 认为无法执行，将抛出一个错误。

为了获得最佳效果，请尽可能提供清晰、详细的步骤描述。

关联文档：

- [模型策略](./model-strategy)

:::

### `agent.aiTap()`

点击某个元素。

- 类型

```typescript
function aiTap(locate: string | Object, options?: Object): Promise<void>;
```

- 参数：
    - `locate: string | Object` - 用自然语言描述的元素定位，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `deepThink?: boolean` - 是否开启深度思考。如果为 true，Midscene 会调用 AI 模型两次以精确定位元素，从而提升准确性。默认值为 false。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显。
        - `xpath?: string` - 目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true
- 返回值：

    - `Promise<void>`

- 示例：

```typescript
await agent.aiTap('页面顶部的登录按钮');

// 使用 deepThink 功能精确定位元素
await agent.aiTap('页面顶部的登录按钮', { deepThink: true });
```

### `agent.aiHover()`

> 仅在 web 页面中可用，在 Android 下不可用

鼠标悬停某个元素上。

- 类型

```typescript
function aiHover(locate: string | Object, options?: Object): Promise<void>;
```

- 参数：
    - `locate: string | Object` - 用自然语言描述的元素定位，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `deepThink?: boolean` - 是否开启深度思考。如果为 true，Midscene 会调用 AI 模型两次以精确定位元素，从而提升准确性。默认值为 false。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显。
        - `xpath?: string` - 目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true
- 返回值：

    - `Promise<void>`

- 示例：

```typescript
await agent.aiHover('页面顶部的登录按钮');
```

### `agent.aiInput()`

在某个元素中输入文本。

- 类型

```typescript
function aiInput(
  text: string | Object,
  locate: string,
  options?: Object,
): Promise<void>;
```

- 参数：

    - `text: string` - 要输入的文本内容。
        - 当 `mode` 为 `'replace'` 时：文本将替换输入框中的所有现有内容。
        - 当 `mode` 为 `'append'` 时：文本将追加到现有内容后面。
        - 当 `mode` 为 `'clear'` 时：会忽略文本内容，仅清空输入框。
    - `locate: string | Object` - 用自然语言描述的元素定位，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `deepThink?: boolean` - 是否开启深度思考。如果为 true，Midscene 会调用 AI 模型两次以精确定位元素，从而提升准确性。默认值为 false。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显。
        - `xpath?: string` - 目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true
        - `autoDismissKeyboard?: boolean` - 如果为 true，则键盘会在输入文本后自动关闭，仅在 Android/iOS 中有效。默认值为 true。
        - `mode?: 'replace' | 'clear' | 'append'` - 输入模式。(默认值: 'replace')
            - `'replace'`: 先清空输入框，然后输入文本。
            - `'append'`: 将文本追加到现有内容后面，不清空输入框。
            - `'clear'`: 清空输入框，不会输入新的文本。

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
await agent.aiInput('Hello World', '搜索框');
```

### `agent.aiKeyboardPress()`

按下键盘上的某个键。

- 类型

```typescript
function aiKeyboardPress(
  key: string,
  locate?: string | Object,
  options?: Object,
): Promise<void>;
```

- 参数：

    - `key: string` - 要按下的键，如 `Enter`、`Tab`、`Escape` 等。不支持组合键。可在[我们的源码中查看完整的按键名称列表](https://github.com/web-infra-dev/midscene/blob/main/packages/shared/src/us-keyboard-layout.ts)。
    - `locate?: string | Object` - 用自然语言描述的元素定位，，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `deepThink?: boolean` - 是否开启深度思考。如果为 true，Midscene 会调用 AI 模型两次以精确定位元素，从而提升准确性。默认值为 false。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显。
        - `xpath?: string` - 目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
await agent.aiKeyboardPress('Enter', '搜索框');
```

### `agent.aiScroll()`

滚动页面或某个元素。

- 类型

```typescript
function aiScroll(
  scrollParam: PlanningActionParamScroll,
  locate?: string | Object,
  options?: Object,
): Promise<void>;
```

- 参数：

    - `scrollParam: PlanningActionParamScroll` - 滚动参数
        - `direction?: 'down' | 'up' | 'left' | 'right'` - 滚动方向，默认值为 `down`。不论是 Android 还是 Web，这里的滚动方向都是指页面哪个方向的内容会进入屏幕。比如当滚动方向是 `down` 时，页面下方被隐藏的内容会从屏幕底部开始逐渐向上露出。
        - `scrollType?: 'singleAction' | 'scrollToBottom' | 'scrollToTop' | 'scrollToRight' | 'scrollToLeft'` - 滚动类型，默认值为 `singleAction`。
        - `distance?: number | null` - 滚动距离，单位为像素。设置为 `null` 表示由 Midscene 自动决定。
    - `locate?: string | Object` - 用自然语言描述的元素定位，或[使用图片作为提示词](#使用图片作为提示词)。如果未传入，Midscene 会在当前鼠标位置滚动。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `deepThink?: boolean` - 是否开启深度思考。如果为 true，Midscene 会调用 AI 模型两次以精确定位元素，从而提升准确性。默认值为 false。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显。
        - `xpath?: string` - 目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
await agent.aiScroll(
  { direction: 'up', distance: 100, scrollType: 'singleAction' },
  '表单区域',
);
```

### `agent.aiDoubleClick()`

双击某个元素。

- 类型

```typescript
function aiDoubleClick(locate: string | Object, options?: Object): Promise<void>;
```

- 参数：

    - `locate: string | Object` - 用自然语言描述的元素定位，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `deepThink?: boolean` - 是否开启深度思考。如果为 true，Midscene 会调用 AI 模型两次以精确定位元素，从而提升准确性。默认值为 false。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显。
        - `xpath?: string` - 目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
await agent.aiDoubleClick('页面顶部的文件名称');

// 使用 deepThink 功能精确定位元素
await agent.aiDoubleClick('页面顶部的文件名称', { deepThink: true });
```

### `agent.aiRightClick()`

> 仅在 web 页面中可用，在 Android 下不可用

右键点击某个元素。请注意，Midscene 在右键点击后无法与浏览器原生上下文菜单交互。这个接口通常用于已经监听了右键点击事件的元素。

- 类型

```typescript
function aiRightClick(locate: string | Object, options?: Object): Promise<void>;
```

- 参数：

    - `locate: string | Object` - 用自然语言描述的元素定位，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `deepThink?: boolean` - 是否开启深度思考。如果为 true，Midscene 会调用 AI 模型两次以精确定位元素，从而提升准确性。默认值为 false。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显。
        - `xpath?: string` - 目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
await agent.aiRightClick('页面顶部的文件名称');

// 使用 deepThink 功能精确定位元素
await agent.aiRightClick('页面顶部的文件名称', { deepThink: true });
```

:::tip 关于 `deepThink` （深度思考）特性

`deepThink` 会让 Midscene 发起两次定位请求以提升准确性。这在目标元素面积较小、难以和周围元素区分时非常有用。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显，建议按需开启。

:::

## 数据提取

### `agent.aiAsk()`

使用此方法，你可以针对当前页面，直接向 AI 模型发起提问，并获得字符串形式的回答。

- 类型

```typescript
function aiAsk(prompt: string | Object, options?: Object): Promise<string>;
```

- 参数：

    - `prompt: string | Object` - 用自然语言描述的询问内容，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `domIncluded?: boolean | 'visible-only'` - 是否向模型发送精简后的 DOM 信息，一般用于提取 UI 中不可见的属性，比如图片的链接。如果设置为 `'visible-only'`，则只发送可见的元素。默认值为 false。
        - `screenshotIncluded?: boolean` - 是否向模型发送截图。默认值为 true。

- 返回值：

    - 返回一个 Promise。返回 AI 模型的回答。

- 示例：

```typescript
const result = await agent.aiAsk('当前页面的应该怎么进行测试？');
console.log(result); // 输出 AI 模型的回答
```

除了 `aiAsk` 方法，你还可以使用 `aiQuery` 方法，直接从 UI 提取结构化的数据。

### `agent.aiQuery()`

使用此方法，你可以直接从 UI 提取结构化的数据。只需在 `dataDemand` 中描述期望的数据格式（如字符串、数字、JSON、数组等），Midscene 即返回相应结果。

- 类型

```typescript
function aiQuery<T>(dataDemand: string | Object, options?: Object): Promise<T>;
```

- 参数：

    - `dataDemand: T`: 描述预期的返回值和格式。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `domIncluded?: boolean | 'visible-only'` - 是否向模型发送精简后的 DOM 信息，一般用于提取 UI 中不可见的属性，比如图片的链接。如果设置为 `'visible-only'`，则只发送可见的元素。默认值为 false。
        - `screenshotIncluded?: boolean` - 是否向模型发送截图。默认值为 true。

- 返回值：

    - 返回值可以是任何合法的基本类型，比如字符串、数字、JSON、数组等。
    - 你只需在 `dataDemand` 中描述它，Midscene 就会给你满足格式的返回。

- 示例：

```typescript
const dataA = await agent.aiQuery({
  time: '左上角展示的日期和时间，string',
  userInfo: '用户信息，{name: string}',
  tableFields: '表格的字段名，string[]',
  tableDataRecord: '表格中的数据记录，{id: string, [fieldName]: string}[]',
});

// 你也可以用纯字符串描述预期的返回值格式：

// dataB 将是一个字符串数组
const dataB = await agent.aiQuery('string[]，列表中的任务名称');

// dataC 将是一个包含对象的数组
const dataC = await agent.aiQuery(
  '{name: string, age: string}[], 表格中的数据记录',
);

// 使用 domIncluded 功能提取 UI 中不可见的属性
const dataD = await agent.aiQuery(
  '{name: string, age: string, avatarUrl: string}[], 表格中的数据记录',
  { domIncluded: true },
);
```

此外，我们还提供了 `aiBoolean()`, `aiNumber()`, `aiString()` 三个便捷方法，用于直接提取布尔值、数字和字符串。

### `agent.aiBoolean()`

从 UI 中提取一个布尔值。

- 类型

```typescript
function aiBoolean(prompt: string | Object, options?: Object): Promise<boolean>;
```

- 参数：

    - `prompt: string` - 用自然语言描述的期望值，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `domIncluded?: boolean | 'visible-only'` - 是否向模型发送精简后的 DOM 信息，一般用于提取 UI 中不可见的属性，比如图片的链接。如果设置为 `'visible-only'`，则只发送可见的元素。默认值为 false。
        - `screenshotIncluded?: boolean` - 是否向模型发送截图。默认值为 true。

- 返回值：

    - 返回一个 Promise。当 AI 返回结果时解析为布尔值。

- 示例：

```typescript
const boolA = await agent.aiBoolean('是否存在登录对话框');

// 使用 domIncluded 功能提取 UI 中不可见的属性
const boolB = await agent.aiBoolean('忘记密码按钮是否存在链接', {
  domIncluded: true,
});
```

### `agent.aiNumber()`

从 UI 中提取一个数字。

- 类型

```typescript
function aiNumber(prompt: string | Object, options?: Object): Promise<number>;
```

- 参数：

    - `prompt: string | Object` - 用自然语言描述的期望值，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `domIncluded?: boolean | 'visible-only'` - 是否向模型发送精简后的 DOM 信息，一般用于提取 UI 中不可见的属性，比如图片的链接。如果设置为 `'visible-only'`，则只发送可见的元素。默认值为 false。
        - `screenshotIncluded?: boolean` - 是否向模型发送截图。默认值为 true。

- 返回值：

    - 返回一个 Promise。当 AI 返回结果时解析为数字。

- 示例：

```typescript
const numberA = await agent.aiNumber('账户剩余的积分');

// 使用 domIncluded 功能提取 UI 中不可见的属性
const numberB = await agent.aiNumber('账户剩余的积分元素的 value 值', {
  domIncluded: true,
});
```

### `agent.aiString()`

从 UI 中提取一个字符串。

- 类型

```typescript
function aiString(prompt: string | Object, options?: Object): Promise<string>;
```

- 参数：

    - `prompt: string | Object` - 用自然语言描述的期望值，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `domIncluded?: boolean | 'visible-only'` - 是否向模型发送精简后的 DOM 信息，一般用于提取 UI 中不可见的属性，比如图片的链接。如果设置为 `'visible-only'`，则只发送可见的元素。默认值为 false。
        - `screenshotIncluded?: boolean` - 是否向模型发送截图。默认值为 true。

- 返回值：

    - 返回一个 Promise。当 AI 返回结果时解析为字符串。

- 示例：

```typescript
const stringA = await agent.aiString('当前列表的第一条记录的名称');

// 使用 domIncluded 功能提取 UI 中不可见的属性
const stringB = await agent.aiString('当前列表的第一条记录的跳转链接', {
  domIncluded: true,
});
```

## 更多方法

### `agent.aiAssert()`

通过自然语言描述一个断言条件，让 AI 判断该条件是否为真。当条件不满足时，SDK 会抛出错误，并在错误信息中追加 AI 返回的详细原因。

- 类型

```typescript
function aiAssert(
  assertion: string | Object, 
  errorMsg?: string, 
  options?: Object
): Promise<void>;
```

- 参数：

    - assertion: string | Object - 用自然语言描述的断言条件，或[使用图片作为提示词](#使用图片作为提示词)。
    - errorMsg?: string - 当断言失败时附加的可选错误提示信息。
    - options?: Object - 可选，一个配置对象，包含：
        - `domIncluded?: boolean | 'visible-only'` - 是否向模型发送精简后的 DOM 信息，一般用于提取 UI 中不可见的属性，比如图片的链接。如果设置为 `'visible-only'`，则只发送可见的元素。默认值为 false。
        - `screenshotIncluded?: boolean` - 是否向模型发送截图。默认值为 true。

- 返回值：

    - 返回一个 Promise。当断言成功时解析为 void；若断言失败，则抛出一个错误，错误信息包含 `errorMsg` 以及 AI 生成的原因。

- 示例：

```typescript
await agent.aiAssert('"Sauce Labs Onesie" 的价格是 7.99');
```

:::tip

断言在测试脚本中非常重要。为了降低因 AI 幻觉导致错误断言的风险（例如遗漏错误），你也可以使用 `.aiQuery` 加上常规的 JavaScript 断言来替代 `.aiAssert`。

例如，你可以这样替代上面的断言代码：

```typescript
const items = await agent.aiQuery(
  '"{name: string, price: number}[], 返回商品名称和价格列表',
);
const onesieItem = items.find((item) => item.name === 'Sauce Labs Onesie');
expect(onesieItem).toBeTruthy();
expect(onesieItem.price).toBe(7.99);
```

:::

### `agent.aiLocate()`

通过自然语言描述一个元素的定位。

- 类型

```typescript
function aiLocate(
  locate: string | Object,
  options?: Object,
): Promise<{
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  center: [number, number];
  scale: number; // device pixel ratio
}>;
```

- 参数：

    - `locate: string | Object` - 用自然语言描述的元素定位，或[使用图片作为提示词](#使用图片作为提示词)。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `deepThink?: boolean` - 是否开启深度思考。如果为 true，Midscene 会调用 AI 模型两次以精确定位元素，从而提升准确性。默认值为 false。对于新一代模型（如 Qwen3 / Doubao 1.6 / Gemini 3），带来的收益不再明显。
        - `xpath?: string` - 目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        - `cacheable?: boolean` - 当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 true

- 返回值：

    - 返回一个 Promise。当元素定位成功时解析为元素定位信息。

- 示例：

```typescript
const locateInfo = await agent.aiLocate('页面顶部的登录按钮');
console.log(locateInfo);
```

### `agent.aiWaitFor()`

等待某个条件达成。考虑到 AI 服务的成本，检查间隔不会超过 `checkIntervalMs` 毫秒。

- 类型

```typescript
function aiWaitFor(
  assertion: string,
  options?: {
    timeoutMs?: number;
    checkIntervalMs?: number;
  },
): Promise<void>;
```

- 参数：

    - `assertion: string` - 用自然语言描述的断言条件
    - `options?: object` - 可选的配置对象
        - `timeoutMs?: number` - 超时时间（毫秒，默认为 15000）。每轮检查开始时都会记录时间，只要该时间点仍在超时窗口内，就会进入下一轮检查；否则视为超时
        - `checkIntervalMs?: number` - 检查间隔（毫秒），默认为 3000

- 返回值：

    - 返回一个 Promise。当断言成功时解析为 void；若超时，则抛出错误。

- 示例：

```typescript
// 基本用法
await agent.aiWaitFor('界面上至少有一个耳机的信息');

// 使用自定义配置
await agent.aiWaitFor('购物车图标显示数量为 2', {
  timeoutMs: 30000, // 等待 30 秒
  checkIntervalMs: 5000, // 每 5 秒检查一次
});
```

:::tip

考虑到 AI 服务的时间消耗，`.aiWaitFor` 并不是一个特别高效的方法。使用一个普通的 `sleep` 可能是替代 `waitFor` 的另一种方式。

:::

### `agent.runYaml()`

执行一个 YAML 格式的自动化脚本。脚本中的 `tasks` 部分会被解析和执行，并返回所有 `.aiQuery` 调用的结果。

- 类型

```typescript
function runYaml(yamlScriptContent: string): Promise<{ result: any }>;
```

- 参数：

    - `yamlScriptContent: string` - YAML 格式的脚本内容

- 返回值：

    - 返回一个包含 `result` 属性的对象，其中包含所有 `aiQuery` 调用的结果

- 示例：

```typescript
const { result } = await agent.runYaml(`
tasks:
  - name: search weather
    flow:
      - ai: input 'weather today' in input box, click search button
      - sleep: 3000

  - name: query weather
    flow:
      - aiQuery: "the result shows the weather info, {description: string}"
`);
console.log(result);
```

:::tip

更多关于 YAML 脚本的信息，请参考 [Automate with Scripts in YAML](./automate-with-scripts-in-yaml)。

:::

### `agent.setAIActContext()`

设置在调用 `agent.aiAct()` 或 `agent.ai()` 时，发送给 AI 模型的背景知识。这个设置会覆盖之前的设置。

对于即时操作类型的 API，比如 `aiTap()`，这个设置不会生效。

- 类型

```typescript
function setAIActContext(aiActContext: string): void;
```

- 参数：

    - `aiActContext: string` - 要发送给 AI 模型的背景知识。`aiActionContext` 旧参数名依然可用。

- 示例：

```typescript
await agent.setAIActContext('如果 “使用cookie” 对话框存在，先关闭它');
```

:::note

`agent.setAIActionContext()` 已被弃用，请改用 `agent.setAIActContext()`。弃用的方法仍作为兼容别名保留。

:::

### `agent.evaluateJavaScript()`

> 仅在 web 页面中可用，在 Android 下不可用

这个方法允许你在 web 页面上下文中执行一段 JavaScript 代码，并返回执行结果。

- 类型

```typescript
function evaluateJavaScript(script: string): Promise<any>;
```

- 参数：

    - `script: string` - 要执行的 JavaScript 代码。

- 返回值：

    - 返回执行结果。

- 示例：

```typescript
const result = await agent.evaluateJavaScript('document.title');
console.log(result);
```

### `agent.recordToReport()`

在报告文件中记录当前截图，并添加描述。

- 类型

```typescript
function recordToReport(title?: string, options?: Object): Promise<void>;
```

- 参数：

    - `title?: string` - 可选，截图的标题，如果未提供，则标题为 'untitled'。
    - `options?: Object` - 可选，一个配置对象，包含：
        - `content?: string` - 截图的描述。

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
await agent.recordToReport('登录页面', {
  content: '用户 A',
});
```

### `agent.freezePageContext()`

冻结当前页面上下文，使后续所有的操作都复用同一个页面快照，避免多次重复获取页面状态。在执行大量并发操作时，它可以显著提升性能。

一些注意点：
* 通常情况下，你不需要使用这个方法，除非你确定“页面状态获取”是脚本性能瓶颈。
* 需要及时调用 `agent.unfreezePageContext()` 来恢复实时页面状态。
* 不要在交互类操作中使用这个方法，它会让 AI 模型无法感知到页面的最新状态，产生令人困惑的错误。

- 类型

```typescript
function freezePageContext(): Promise<void>;
```

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
// 冻结页面上下文，确保多个操作看到相同的页面状态
await agent.freezePageContext();

// 执行一些操作...
const results = await Promise.all([
  await agent.aiQuery('Username input box value'),
  await agent.aiQuery('Password input box value'),
  await agent.aiLocate('Login button'),
]);
console.log(results);

// 解冻页面上下文
await agent.unfreezePageContext();
```

:::tip

在报告中，使用冻结上下文的操作会在 Insight tab 中显示 🧊 图标。

:::

### `agent.unfreezePageContext()`

解冻页面上下文，恢复使用实时的页面状态。

- 类型

```typescript
function unfreezePageContext(): Promise<void>;
```

- 返回值：

    - `Promise<void>`

### `agent._unstableLogContent()`

从报告文件中获取日志内容。日志内容的结构可能会在未来发生变化。

- 类型

```typescript
function _unstableLogContent(): Object;
```

- 返回值：

    - 返回一个对象，包含日志内容。

- 示例：

```typescript
const logContent = agent._unstableLogContent();
console.log(logContent);
```

## 属性

### `.reportFile`

报告文件的路径。

### 在运行时设置环境变量（已弃用）

> 已弃用，请使用 `modelConfig` 参数代替。

通过 `overrideAIConfig` 方法在运行时设置全局环境变量。

```typescript
import { overrideAIConfig } from '@midscene/web/puppeteer'; // 或其他的 Agent

overrideAIConfig({
  MIDSCENE_MODEL_BASE_URL: '...', // 推荐使用新的变量名
  MIDSCENE_MODEL_API_KEY: '...', // 推荐使用新的变量名
  MIDSCENE_MODEL_NAME: '...',

  // 旧的变量名仍然兼容：
  // OPENAI_BASE_URL: '...',
  // OPENAI_API_KEY: '...',
});
```

## 使用图片作为提示词

你可以在提示词中使用图片作为补充，来描述无法通过自然语言表达的内容。

使用图片作为提示词时，提示词的参数格式如下：

```javascript
{
  // 提示词文本，其中可提及需要使用的图片
  prompt: string,
  // 提示词中提到的图片
  images?: {
    // 图片名称，需要和提示词文本中提到的图片名称对应
    name: string,
    // 图片 url，可以是本地图片路径、Base64 字符串，或者图片的 http 链接
    url: string
  }[]
  // 开启该选项后，http 格式的图片链接会被转化为 Base64 编码发送给大模型，适用于图片链接不是公开可访问的情况。
  convertHttpImage2Base64?: boolean
}
```

- 示例一：使用图片描述点击位置

```javascript
await agent.aiTap({
  prompt: '指定 logo',
  images: [
    {
      name: '指定 logo',
      url: 'https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png',
    },
  ],
});
```

- 示例二：使用图片进行页面断言

```javascript
await agent.aiAssert({
  prompt: '页面上是否存在指定 logo',
  images: [
    {
      name: '指定 logo',
      url: 'https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png',
    },
  ],
});
```

**图片尺寸的注意事项**

在提示词中使用图片时，可能需要关注模型提供商对图片体积和尺寸的要求，过大（比如超过 10M）或过小（比如小于 10 像素）的图片都有可能导致模型调用时出现报错，具体的限制请以你所使用模型提供商的文档为准。

## 报告合并工具

在运行多个自动化工作流时，每个 agent 都会生成独立的报告文件。`ReportMergingTool` 提供了将多个自动化报告合并为单个报告的能力，便于统一查看和管理自动化结果。

### 使用场景

- 在自动化套件中运行多个工作流，希望生成一个统一的报告
- 跨平台自动化(如 Web 和 Android)需要合并不同平台的自动化结果
- CI/CD 流程中需要生成汇总的自动化报告

### `new ReportMergingTool()`

创建一个报告合并工具实例。

- 示例:

```typescript
import { ReportMergingTool } from '@midscene/core/report';

const reportMergingTool = new ReportMergingTool();
```

### `.append()`

将自动化报告添加到待合并列表中。通常在每个自动化工作流结束后调用此方法。

- 类型

```typescript
function append(reportInfo: ReportFileWithAttributes): void;
```

- 参数:

    - `reportInfo: ReportFileWithAttributes` - 报告信息对象，包含:
        - `reportFilePath: string` - 报告文件的路径，通常是 `agent.reportFile`
        - `reportAttributes: object` - 报告属性
            - `testId: string` - 自动化工作流的唯一标识符
            - `testTitle: string` - 自动化工作流标题
            - `testDescription: string` - 自动化工作流描述
            - `testDuration: number` - 自动化工作流执行时长(毫秒)
            - `testStatus: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'` - 自动化状态

- 返回值:

    - `void`

- 示例:

```typescript
// 在 afterEach 钩子中添加报告
afterEach((ctx) => {
  let workflowStatus = 'passed';
  if (ctx.task.result?.state === 'fail') {
    workflowStatus = 'failed';
  }

  reportMergingTool.append({
    reportFilePath: agent.reportFile as string,
    reportAttributes: {
      testId: ctx.task.name,
      testTitle: ctx.task.name,
      testDescription: '自动化工作流描述',
      testDuration: Date.now() - startTime,
      testStatus: workflowStatus,
    },
  });
});
```

### `.mergeReports()`

执行报告合并操作，将所有添加的报告合并为一个 HTML 文件。

- 类型

```typescript
function mergeReports(
  reportFileName?: 'AUTO' | string,
  opts?: {
    rmOriginalReports?: boolean;
    overwrite?: boolean;
  },
): string | null;
```

- 参数:

    - `reportFileName?: 'AUTO' | string` - 合并后的报告文件名
        - 默认为 `'AUTO'`，自动生成文件名
        - 可以指定自定义文件名(不需要 `.html` 后缀)
    - `opts?: object` - 可选配置对象
        - `rmOriginalReports?: boolean` - 是否删除原始报告文件,默认为 `false`
        - `overwrite?: boolean` - 如果目标文件已存在是否覆盖，默认为 `false`

- 返回值:

    - 成功时返回合并后的报告文件路径
    - 如果报告数量不足(少于 2 个)，返回 `null`

- 示例:

```typescript
// 基本用法 - 使用自动生成的文件名
afterAll(() => {
  reportMergingTool.mergeReports();
});

// 指定自定义文件名
afterAll(() => {
  reportMergingTool.mergeReports('my-automation-report');
});

// 合并后删除原始报告
afterAll(() => {
  reportMergingTool.mergeReports('my-automation-report', {
    rmOriginalReports: true,
  });
});

// 覆盖已存在的报告文件
afterAll(() => {
  reportMergingTool.mergeReports('my-automation-report', {
    overwrite: true,
  });
});
```

### `.clear()`

清空待合并的报告列表。如果需要在同一个实例中进行多次合并操作,可以使用此方法清空之前的报告列表。

- 类型

```typescript
function clear(): void;
```

- 返回值:

    - `void`

- 示例:

```typescript
reportMergingTool.mergeReports('first-batch');
reportMergingTool.clear(); // 清空列表
// 继续添加新的报告...
```

### 完整示例

以下是在 Vitest 框架中使用 `ReportMergingTool` 的完整示例:

```typescript
import { describe, it, beforeEach, afterEach, afterAll } from 'vitest';
import { AndroidAgent, AndroidDevice } from '@midscene/android';
import { ReportMergingTool } from '@midscene/core/report';

describe('Android 设置自动化', () => {
  let device: AndroidDevice;
  let agent: AndroidAgent;
  let startTime: number;
  const reportMergingTool = new ReportMergingTool();

  beforeEach((ctx) => {
    startTime = performance.now();
    agent = new AndroidAgent(device, {
      groupName: ctx.task.name,
    });
  });

  afterEach((ctx) => {
    // 确定自动化状态
    let workflowStatus = 'passed';
    if (ctx.task.result?.state === 'pass') {
      workflowStatus = 'passed';
    } else if (ctx.task.result?.state === 'skip') {
      workflowStatus = 'skipped';
    } else if (ctx.task.result?.errors?.[0]?.message.includes('timed out')) {
      workflowStatus = 'timedOut';
    } else {
      workflowStatus = 'failed';
    }

    // 添加报告到合并列表
    reportMergingTool.append({
      reportFilePath: agent.reportFile as string,
      reportAttributes: {
        testId: ctx.task.name,
        testTitle: ctx.task.name,
        testDescription: '自动化工作流描述',
        testDuration: (Date.now() - ctx.task.result?.startTime!) | 0,
        testStatus: workflowStatus,
      },
    });
  });

  afterAll(() => {
    // 合并所有自动化报告
    reportMergingTool.mergeReports('android-settings-automation-report');
  });

  it('切换 WLAN', async () => {
    await agent.aiAct('找到并进入 WLAN 设置');
    await agent.aiAct('切换 WLAN 状态一次');
  });

  it('切换蓝牙', async () => {
    await agent.aiAct('找到并进入蓝牙设置');
    await agent.aiAct('切换蓝牙状态一次');
  });
});
```

:::tip

合并后的报告文件会保存在 `midscene_run/report` 目录下。你可以使用浏览器打开合并后的 HTML 文件查看所有自动化工作流的执行情况。

:::



---
url: /zh/automate-with-scripts-in-yaml.md
---



# 使用 YAML 格式的自动化脚本

在大多数情况下，开发者编写自动化脚本只是为了执行一些简单流程，比如检查某些内容是否出现，或者验证某个关键用户路径是否可用。此时维护一个大型测试项目会显得毫无必要。

⁠Midscene 提供了一种基于 `.yaml` 文件的自动化测试方法，这有助于你专注于编写流程，而不是测试框架。

这里有一个示例，通过阅读它的内容，你应该已经理解了它的工作原理。

```yaml
web:
  url: https://www.bing.com

tasks:
  - name: 搜索天气
    flow:
      - ai: 搜索 "今日天气"
      - sleep: 3000

  - name: 检查结果
    flow:
      - aiAssert: 结果中展示了天气信息
```

:::info 样例项目

你可以在这里找到使用 YAML 脚本做自动化的样例项目

- [Web](https://github.com/web-infra-dev/midscene-example/tree/main/yaml-scripts-demo)
- [Android](https://github.com/web-infra-dev/midscene-example/tree/main/android/yaml-scripts-demo)

:::

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


如果需要通过命令行执行 YAML 工作流，请查看 [命令行工具](./command-line-tools)，了解安装、`.env` 支持以及 `midscene` 命令的用法。

## 脚本文件结构

脚本文件使用 YAML 格式来描述自动化任务。它定义了要操作的目标（如网页或安卓应用）以及一系列要执行的步骤。

一个标准的 `.yaml` 脚本文件包含 `web`、`android` 或 `ios` 部分配置环境，可选的 `agent` 部分配置 AI Agent 行为，以及一个 `tasks` 部分来定义自动化任务。

```yaml
web:
  url: https://www.bing.com

# tasks 部分定义了要执行的一系列步骤
tasks:
  - name: 搜索天气
    flow:
      - ai: 搜索 "今日天气"
      - sleep: 3000
      - aiAssert: 结果显示天气信息
```

### `agent` 部分

`agent` 部分用于配置 AI Agent 的行为和测试报告相关选项。所有字段都是可选的。

```yaml
# AI agent 配置
agent:
  # 测试标识符，用于报告和缓存识别，可选
  testId: <string>

  # 报告组名称，可选
  groupName: <string>

  # 报告组描述，可选
  groupDescription: <string>

  # 是否生成测试报告，可选，默认 true
  generateReport: <boolean>

  # 是否自动打印报告消息，可选，默认 true
  autoPrintReportMsg: <boolean>

  # 自定义报告文件名，可选
  reportFileName: <string>

  # AI 最大重规划循环次数，可选，默认 20（UI-TARS 模型为 40）
  replanningCycleLimit: <number>

  # 在调用 aiAct 时发送给 AI 模型的背景知识，可选
  aiActContext: <string>
  # 兼容的旧字段（aiActionContext）仍可使用，但不推荐

  # 缓存配置，可选
  cache:
    # 缓存策略，可选，可选值：'read-only' | 'read-write' | 'write-only'
    strategy: <string>
    # 缓存 ID，必填
    id: <string>
```

:::tip Agent 配置说明

- **适用环境**：Web、iOS 和 Android 环境都支持 `agent` 配置
- **testId 优先级**：CLI 参数 > YAML agent.testId > 文件名
- **aiActContext**：为 AI 模型提供背景知识，例如处理弹窗、业务介绍等常见场景。兼容旧字段（见注释），但不建议新脚本继续使用。
- **缓存配置**：详细用法请参考 [缓存功能文档](./caching.mdx)

:::

#### 使用示例

```yaml
# agent 配置，适用于所有环境
agent:
  testId: "checkout-test"
  groupName: "E2E 测试套件"
  groupDescription: "完整的购物流程测试"
  generateReport: true
  autoPrintReportMsg: false
  reportFileName: "checkout-report"
  replanningCycleLimit: 30
  aiActContext: "如果出现弹窗，点击同意。如果出现登录页面，跳过它。"
  cache:
    id: "checkout-cache"
    strategy: "read-write"

# iOS 环境配置
ios:
  launch: https://www.bing.com
  wdaPort: 8100

# 或 Android 环境配置
android:
  deviceId: s4ey59
  launch: https://www.bing.com

tasks:
  - name: 搜索天气
    flow:
      - ai: 搜索 "今日天气"
      - aiAssert: 结果显示天气信息
```


### `web` 部分

```yaml
web:
  # 访问的 URL，必填。如果提供了 `serve` 参数，则提供相对路径
  url: <url>

  # 在本地路径下启动一个静态服务，可选
  serve: <root-directory>

  # 浏览器 UA，可选
  userAgent: <ua>

  # 浏览器视口宽度，可选，默认 1280
  viewportWidth: <width>

  # 浏览器视口高度，可选，默认 960
  viewportHeight: <height>

  # 浏览器设备像素比，可选，默认 1
  deviceScaleFactor: <scale>

  # JSON 格式的浏览器 Cookie 文件路径，可选
  cookie: <path-to-cookie-file>

  # 等待网络空闲的策略，可选
  waitForNetworkIdle:
    # 等待超时时间，可选，默认 2000ms
    timeout: <ms>
    # 是否在等待超时后继续，可选，默认 true
    continueOnNetworkIdleError: <boolean>

  # 输出 aiQuery/aiAssert 结果的 JSON 文件路径，可选
  output: <path-to-output-file>

  # 是否保存日志内容到 JSON 文件，可选，默认 `false`。如果为 true，保存到 `unstableLogContent.json` 文件中。如果为字符串，则保存到该字符串指定的路径中。日志内容的结构可能会在未来发生变化。
  unstableLogContent: <boolean | path-to-unstable-log-file>

  # 是否限制页面在当前 tab 打开，可选，默认 true
  forceSameTabNavigation: <boolean>

  # 桥接模式，可选，默认 false，可以为 'newTabWithUrl' 或 'currentTab'。更多详情请参阅后文
  bridgeMode: false | 'newTabWithUrl' | 'currentTab'

  # 是否在桥接断开时关闭新创建的标签页，可选，默认 false
  closeNewTabsAfterDisconnect: <boolean>

  # 是否忽略 HTTPS 证书错误，可选，默认 false
  acceptInsecureCerts: <boolean>

  # 自定义 Chrome 启动参数（仅 Puppeteer 模式，不支持桥接模式），可选
  # 用于自定义 Chrome 浏览器行为，例如禁用第三方 Cookie 阻止
  # ⚠️ 安全警告：某些参数（如 --no-sandbox、--disable-web-security）可能降低浏览器安全性
  # 仅在受控的测试环境中使用
  chromeArgs:
    - '--disable-features=ThirdPartyCookiePhaseout'
    - '--disable-features=SameSiteByDefaultCookies'
    - '--window-size=1920,1080'
```


### `android` 部分

```yaml
android:
  # 设备 ID，可选，默认使用第一个连接的设备
  deviceId: <device-id>

  # 启动 URL，可选，默认使用设备当前页面
  launch: <url>

  # 输出 aiQuery/aiAssert 结果的 JSON 文件路径，可选
  output: <path-to-output-file>

  # 其他 AndroidDevice 构造函数支持的所有选项
  # 例如：androidAdbPath, remoteAdbHost, remoteAdbPort,
  # imeStrategy, displayId, autoDismissKeyboard, keyboardDismissStrategy,
  # screenshotResizeScale, alwaysRefreshScreenInfo 等
  # 完整配置项请参考 AndroidDevice 的构造函数文档
```

:::tip 查看完整的 Android 配置项

YAML 脚本现在支持 `AndroidDevice` 构造函数的所有配置选项。完整的配置项列表请参考 [Android 集成文档中的 AndroidDevice 构造函数](./integrate-with-android#androiddevice-的构造函数)。

:::

#### Android 平台特定动作

Android 平台提供了一些特定的动作，可以在 YAML 脚本的 `flow` 中使用：

**`runAdbShell` - 执行 ADB Shell 命令**

在 Android 设备上执行 ADB shell 命令。

```yaml
android:
  deviceId: 'test-device'

tasks:
  - name: 清除应用数据
    flow:
      - runAdbShell: 'pm clear com.example.app'

  - name: 获取电池信息
    flow:
      - runAdbShell: 'dumpsys battery'
```

常用 ADB Shell 命令：
- `pm clear <package>` - 清除应用数据
- `dumpsys battery` - 获取电池信息
- `dumpsys window` - 获取窗口信息
- `settings get secure android_id` - 获取设备 ID
- `input keyevent <keycode>` - 发送按键事件

**`launch` - 启动应用或 URL**

启动 Android 应用或打开 URL。

```yaml
android:
  deviceId: 'test-device'

tasks:
  - name: 启动设置应用
    flow:
      - launch:
          uri: com.android.settings

  - name: 打开网页
    flow:
      - launch:
          uri: https://www.example.com
```

### `ios` 部分

```yaml
ios:
  # WebDriverAgent 端口，可选，默认 8100
  wdaPort: <port>

  # WebDriverAgent 主机地址，可选，默认 localhost
  wdaHost: <host>

  # 是否自动关闭键盘，可选，默认 false
  autoDismissKeyboard: <boolean>

  # 启动 URL 或应用包名，可选，默认使用设备当前页面
  launch: <url-or-bundle-id>

  # 输出 aiQuery/aiAssert 结果的 JSON 文件路径，可选
  output: <path-to-output-file>

  # 是否保存日志内容到 JSON 文件，可选，默认 `false`。如果为 true，保存到 `unstableLogContent.json` 文件中。如果为字符串，则保存到该字符串指定的路径中。日志内容的结构可能会在未来发生变化。
  unstableLogContent: <boolean | path-to-unstable-log-file>

  # 其他 IOSDevice 构造函数支持的所有选项
  # 完整配置项请参考 IOSDevice 的构造函数文档
```

:::tip 查看完整的 iOS 配置项

YAML 脚本现在支持 `IOSDevice` 构造函数的所有配置选项。完整的配置项列表请参考 [iOS 集成文档中的 IOSDevice 构造函数](./integrate-with-ios#iosdevice-的构造函数)。

:::

#### iOS 平台特定动作

iOS 平台提供了一些特定的动作，可以在 YAML 脚本的 `flow` 中使用：

**`runWdaRequest` - 执行 WebDriverAgent API 请求**

在 iOS 设备上直接执行 WebDriverAgent API 请求。

```yaml
ios:
  launch: 'com.apple.mobilesafari'

tasks:
  - name: 通过 WDA 按下主屏幕按钮
    flow:
      - runWdaRequest:
          method: POST
          endpoint: /session/test/wda/pressButton
          data:
            name: home

  - name: 获取设备信息
    flow:
      - runWdaRequest:
          method: GET
          endpoint: /wda/device/info
```

参数：
- `method`（字符串，必需）：HTTP 方法（GET、POST、DELETE 等）
- `endpoint`（字符串，必需）：WebDriverAgent API 端点
- `data`（任意类型，可选）：请求体数据

常用 WebDriverAgent 端点：
- `/wda/screen` - 获取屏幕信息
- `/wda/device/info` - 获取设备信息
- `/session/{sessionId}/wda/pressButton` - 按硬件按钮
- `/session/{sessionId}/wda/apps/launch` - 启动应用
- `/session/{sessionId}/wda/apps/activate` - 激活应用

**`launch` - 启动应用或 URL**

启动 iOS 应用或打开 URL。

```yaml
ios:
  wdaPort: 8100

tasks:
  - name: 启动设置应用
    flow:
      - launch:
          uri: com.apple.Preferences

  - name: 打开网页
    flow:
      - launch:
          uri: https://www.example.com
```

### `tasks` 部分

`tasks` 部分是一个数组，定义了脚本执行的步骤。记得在每个步骤前添加 `-` 符号，表明这些步骤是个数组。

`flow` 部分的接口与 [API](./api.html) 几乎相同，除了一些参数的嵌套层级。

```yaml
tasks:
  - name: <name>
    continueOnError: <boolean> # 可选，错误时是否继续执行下一个任务，默认 false
    flow:
      # 自动规划(Auto Planning, .ai)
      # ----------------

      # 执行一个交互，`ai` 是 `aiAct` 的简写方式
      - ai: <prompt>
        cacheable: <boolean> # 可选，当启用 [缓存功能](./caching.mdx) 时,是否允许缓存当前 API 调用结果。默认值为 True

      # 这种用法与 `ai` 相同
      # 注意：在之前版本中也被写作 `aiAction`，当前版本兼容两种写法
      - aiAct: <prompt>
        cacheable: <boolean> # 可选，当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 True

      # 即时操作(Instant Action, .aiTap, .aiHover, .aiInput, .aiKeyboardPress, .aiScroll)
      # ----------------

      # 点击一个元素，用 prompt 描述元素位置
      - aiTap: <prompt>
        deepThink: <boolean> # 可选，是否使用深度思考（deepThink）来精确定位元素。默认值为 False
        xpath: <xpath> # 可选，目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        cacheable: <boolean> # 可选，当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 True

      # 鼠标悬停一个元素，用 prompt 描述元素位置
      - aiHover: <prompt>
        deepThink: <boolean> # 可选，是否使用深度思考（deepThink）来精确定位元素。默认值为 False
        xpath: <xpath> # 可选，目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空

        cacheable: <boolean> # 可选，当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 True

      # 输入文本到一个元素，用 prompt 描述元素位置
      - aiInput: <输入框的最终文本内容>
        locate: <prompt>
        deepThink: <boolean> # 可选，是否使用深度思考（deepThink）来精确定位元素。默认值为 False
        xpath: <xpath> # 可选，目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空
        cacheable: <boolean> # 可选，当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 True

      # 在元素上按下某个按键（如 Enter，Tab，Escape 等），用 prompt 描述元素位置
      - aiKeyboardPress: <按键>
        locate: <prompt>
        deepThink: <boolean> # 可选，是否使用深度思考（deepThink）来精确定位元素。默认值为 False
        xpath: <xpath> # 可选，目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空

        cacheable: <boolean> # 可选，当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 True

      # 全局滚动，或滚动 prompt 描述的元素
      - aiScroll:
        direction: 'down' # 或 'up' | 'left' | 'right'，默认值为 'down'
        scrollType: 'singleAction' # 或 'scrollToBottom' | 'scrollToTop' | 'scrollToRight' | 'scrollToLeft'，默认值为 'singleAction'
        distance: <number> # 可选，滚动距离，单位为像素。设置为 null 表示由 Midscene 自动决定。
        locate: <prompt> # 可选，执行滚动的元素
        deepThink: <boolean> # 可选，是否使用深度思考（deepThink）来精确定位元素。默认值为 False
        xpath: <xpath> # 可选，目标元素的 xpath 路径，用于执行当前操作。如果提供了这个 xpath，Midscene 会优先使用该 xpath 来找到元素，然后依次使用缓存和 AI 模型。默认值为空

        cacheable: <boolean> # 可选，当启用 [缓存功能](./caching.mdx) 时，是否允许缓存当前 API 调用结果。默认值为 True

      # 在报告文件中记录当前截图，并添加描述
      - recordToReport: <title> # 可选，截图的标题，如果未提供，则标题为 'untitled'
        content: <content> # 可选，截图的描述

      # 数据提取
      # ----------------

      # 执行一个查询，返回一个 JSON 对象
      - aiQuery: <prompt> # 记得在提示词中描述输出结果的格式
        name: <name> # 查询结果在 JSON 输出中的 key

      # 更多 API
      # ----------------

      # 等待某个条件满足，并设置超时时间(ms，可选，默认 30000)
      - aiWaitFor: <prompt>
        timeout: <ms>

      # 执行一个断言
      - aiAssert: <prompt>
        errorMessage: <error-message> # 可选，当断言失败时打印的错误信息。
        name: <name> # 可选，给断言一个名称，会在 JSON 输出中作为 key 使用

      # 等待一定时间
      - sleep: <ms>

      # 在 web 页面上下文中执行一段 JavaScript 代码
      - javascript: <javascript>
        name: <name> # 可选，给返回值一个名称，会在 JSON 输出中作为 key 使用

  - name: <name>
    flow:
      # ...
```

#### 使用图像提示

对于支持在提示词中附带图像的步骤（参见 [API 参考](./api.html#prompting-with-images)），可以把提示词改写为对象，并通过设置 `images` 字段（一个包含 `name` 和 `url` 的对象数组）来附加图像。该对象包含以下字段：

- `prompt`：发送给模型的文本描述。
- `images`（可选）：提示词引用的参考图像，每一项需要提供 `name` 和 `url`。
- `convertHttpImage2Base64`（可选）：在图片链接无法公开访问时，将 HTTP 链接转换为 Base64 再发送给模型。

图片 URL 可以是本地路径、Base64 字符串或远程链接。如果图片链接无法被模型访问，请设置 `convertHttpImage2Base64: true`，Midscene 会将图像下载后以 Base64 字符串的形式发送给模型。

对于 `aiTap`、`aiHover`、`aiDoubleClick`、`aiRightClick` 等交互操作，请把文本和图像配置写在 `locate` 字段中。

```yaml
tasks:
  - name: 校验品牌一致性
    flow:
      - aiHover:
          locate:
            prompt: 将鼠标移动到包含 GitHub 标志的区域。
            images:
              - name: GitHub 标志
                url: https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png
            convertHttpImage2Base64: true

      - aiTap:
          locate:
            prompt: 点击包含 GitHub 标志的区域。
            images:
              - name: GitHub 标志
                url: https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png
            convertHttpImage2Base64: true
```

对于视觉问答类步骤，例如 `aiAsk`、`aiQuery`、`aiBoolean`、`aiNumber`、`aiString`、`aiAssert`，可以直接设置 `prompt` 和 `images` 字段。

```yaml
tasks:
  - name: 校验品牌一致性
    flow:
      - aiAssert:
          prompt: 判断页面上是否出现该图像。
          images:
            - name: 目标标志
              url: https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png
          convertHttpImage2Base64: true
```



---
url: /zh/awesome-midscene.md
---

# Awesome Midscene

基于 Midscene.js 开发的社区项目精选列表，涵盖不同平台和编程语言的扩展功能。

## 社区项目

### iOS 自动化
- **[midscene-ios](https://github.com/lhuanyu/midscene-ios)** - iOS Mirror 应用的自动化支持工具
    - 支持 iOS 应用程序的自动化测试和交互
    - 将 Midscene 的跨平台能力扩展到苹果移动生态系统

### PC 自动化
- **[midscene-pc](https://github.com/Mofangbao/midscene-pc)** - 支持 Windows、macOS 和 Linux 的 PC 操作设备
    - 支持跨所有主流平台的桌面应用程序自动化测试和交互
    - 支持本地和远程操作能力
- **[midscene-pc-docker](https://github.com/Mofangbao/midscene-pc-docker)** - 预装 Midscene-PC 服务器的 Docker 容器镜像
    - 基于 Ubuntu 20 和 GNOME 桌面，最大化应用程序兼容性
    - 内置 VNC 服务，支持通过浏览器监控桌面操作
    - 一键命令即可在标准服务器上部署自动化客户端

### Python SDK
- **[Midscene-Python](https://github.com/Python51888/Midscene-Python)** - Python 版本的 Midscene SDK
    - 为 Python 开发者提供 Midscene 的 AI 驱动自动化能力
    - 支持与现有 Python 测试和自动化工作流程的集成

### Java SDK
- **[midscene-java](https://github.com/Master-Frank/midscene-java)** by @Master-Frank - Java 版本的 Midscene SDK
    - 提供与 Python 版本类似的体验，适配 JVM 生态
    - 易于整合到现有的 Java 自动化或测试流程
- **[midscene-java](https://github.com/alstafeev/midscene-java)** by @alstafeev - Java 版本的 Midscene SDK
    - 提供用于脚本化 Midscene 的 JVM 原生接口
    - 无缝整合至现有的 Java 测试框架与自动化工作流程

## 如何贡献

创建了扩展 Midscene.js 功能的项目？我们很乐意在这里展示！

要将你的项目添加到这个列表，请在 [Midscene 仓库](https://github.com/web-infra-dev/midscene) 中提交 issue，告知我们你的 awesome midscene 项目。

## 收录标准

Awesome Midscene 应当满足：
- 扩展或集成 Midscene.js 功能
- 积极维护中
- 有清晰的文档和使用示例
- 为 Midscene 社区提供价值

---

*没有看到你喜欢的平台或语言支持？考虑创建一个社区项目或为现有项目贡献代码！*



---
url: /zh/blog-introducing-instant-actions-and-deep-think.md
---

# 即时操作和深度思考

从 Midscene v0.14.0 开始，我们引入了两个新功能：即时操作（Instant Actions）和深度思考（Deep Think）。

## 即时操作（Instant Actions）- 让交互表现更稳定

你可能已经熟悉我们的 `.ai` 接口。它是一个自动规划接口，用于与网页进行交互。例如，当进行搜索时，你可以这样做：

```typescript
await agent.ai('在搜索框中输入 "Headphones"，按下回车键');
```

在接口的背后，Midscene 会调用 LLM 来规划步骤并执行它们。你可以在报告中看到整个过程。这是一个非常常见的 AI Agent 运行模式。

![](/blog/report-planning.png)

与此同时，许多测试工程师希望有一个更快的方式来执行 UI 操作。当在 AI 模型中使用复杂 prompt 时，一些 LLM 模型可能规划出错误的步骤，或者返回元素的坐标不准确。这些不可预测的过程时常常会让人感受到挫败。

为了解决这个问题，我们引入了 `aiTap()`, `aiHover()`, `aiInput()`, `aiKeyboardPress()`, `aiScroll()` 接口。这些接口会直接执行指定的操作，而 AI 模型只负责底层任务，如定位元素等。使用这些接口后，整个过程可以明显更快和更可靠。

例如，上面的搜索操作可以重写为：

```typescript
await agent.aiInput('耳机', '搜索框');
await agent.aiKeyboardPress('Enter');
```

在报告中，你会看到现在已经没有了规划 (Planning) 过程：

![](/blog/report-instant-action.png)

使用这些接口的脚本看起来有点冗余（或者不太“智能”），但请相信，使用这些结构化的接口确实是一个节省时间的好方法，尤其是在操作已经非常明确的时候。

## 深度思考（Deep Think）- 让元素定位更准确

当使用 Midscene 与一些复杂的 UI 控件交互时，LLM 可能很难定位目标元素。我们引入了一个新的选项 `deepThink`（深度思考）到即时操作接口中。

启用 `deepThink` 的即时操作函数签名如下：

```typescript
await agent.aiTap('target', { deepThink: true });
```

`deepThink` 是一种策略。它会首先找到一个包含目标元素的区域，然后“聚焦”在这个区域中再次搜索元素。通过这种方式，目标元素的坐标会更准确。

让我们以 Coze.com 的工作流编辑页面为例。这个页面有许多自定义的图标在侧边栏。这对于 LLM 来说很难区分目标元素和它的周围元素。

![](/blog/coze-sidebar.png)

在即时操作中使用 `deepThink` 后，脚本会变成这样（当然，你也可以使用 javascript 接口）：

```yaml
tasks:
  - name: edit input panel
    flow:
      - aiTap: the triangle icon on the left side of the text "Input"
        deepThink: true
      - aiTap: the first checkbox in the Input form
        deepThink: true
      - aiTap: the expand button on the second row of the Input form (on the right of the checkbox)
        deepThink: true
      - aiTap: the delete button on the second last row of the Input form
        deepThink: true
      - aiTap: the add button on the last row of the Input form （second button from the right）
        deepThink: true
```

通过查看报告文件，你会看到 Midscene 已经找到了页面中的每个目标元素。

![](/blog/report-coze-deep-think.png)

就像上面的例子一样，精细的 `deepThink` 提示词是保持结果稳定的关键。

`deepThink` 只适用于支持视觉定位的模型，如 qwen2.5-vl。如果你使用的是像 gpt-4o 这样的模型，`deepThink` 将无法发挥作用。



---
url: /zh/bridge-mode.md
---



import { PackageManagerTabs } from '@theme';

# Chrome 桥接模式（Bridge Mode）

Midscene Chrome 插件的桥接模式允许你使用本地脚本来控制桌面版 Chrome。脚本既能连接新标签页，也可以附着到当前激活的标签页。

这种方式能复用本地浏览器的 cookies、插件和页面状态，与自动化脚本协作完成任务；在自动化领域也被称作 “man-in-the-loop”。

![bridge mode](/midscene-bridge-mode.png)

:::info Demo Project

查看桥接模式的示例项目：[https://github.com/web-infra-dev/midscene-example/blob/main/bridge-mode-demo](https://github.com/web-infra-dev/midscene-example/blob/main/bridge-mode-demo)

:::

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


> 桥接模式下，AI 模型配置需要写在 Node.js 侧（终端环境变量），而不是浏览器侧。

## 快速开始

### 第一步：在 Chrome 应用商店安装 Midscene 插件

安装 [Midscene Chrome 插件](https://chromewebstore.google.com/detail/midscene/gbldofcpkknbggpkmbdaefngejllnief)。

### 第二步：安装依赖

<PackageManagerTabs command="install @midscene/web tsx --save-dev" />

### 第三步：编写脚本

将以下代码保存为 `./demo-new-tab.ts`。

```typescript
import { AgentOverChromeBridge } from "@midscene/web/bridge-mode";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
Promise.resolve(
  (async () => {
    const agent = new AgentOverChromeBridge();

    // 连接到桌面 Chrome 的新标签页
    // 记得先启动 Chrome 插件并点击 “Allow connection”，否则会超时
    await agent.connectNewTabWithUrl("https://www.bing.com");

    // 与普通 Midscene agent 的 API 相同
    await agent.ai('type "AI 101" and hit Enter');
    await sleep(3000);

    await agent.aiAssert("there are some search results");
    await agent.destroy();
  })()
);
```

### 第四步：启动 Chrome 插件

启动 Chrome 插件并切换到 “Bridge Mode” Tab，点击 “Allow connection”。

<p align="center">
  <img src="/bridge_in_extension.png" alt="bridge in extension" width="400"/>
</p>

### 第五步：运行脚本

运行脚本：

```bash
tsx demo-new-tab.ts
```

执行后你会看到插件状态变为 “connected”，桌面 Chrome 也会打开一个新标签页并交由脚本控制。

:::tip

先运行脚本还是先点击 “Allow connection” 均可。

:::

## 在 YAML 自动化脚本中使用桥接模式

[YAML 自动化脚本](./automate-with-scripts-in-yaml) 让你用更易读的方式描述流程。要启用桥接模式，在 `target` 中设置 `bridgeMode`：使用当前标签页填 `currentTab`，新建标签页填 `newTabWithUrl`。如需销毁时自动关闭新建标签页，可配置 `closeNewTabsAfterDisconnect: true`。

```diff
target:
  url: https://www.bing.com
+ bridgeMode: newTabWithUrl
+ closeNewTabsAfterDisconnect: true
tasks:
```

```bash
midscene ./bing.yaml
```

运行脚本后，请确保在插件里点击 “Allow connection”。

### 不支持的选项

桥接模式会复用桌面浏览器配置，以下选项将被忽略：
- `userAgent`
- `viewportWidth`
- `viewportHeight`
- `viewportScale`
- `waitForNetworkIdle`
- `cookie`

## 远程访问配置

默认情况下，Bridge Server 只监听 `127.0.0.1`，仅允许本机 Chrome 扩展连接。如需跨机器通信（例如脚本运行在机器 A，浏览器在机器 B），可启用远程访问。

**Server 端（Node.js 脚本）**

```typescript
// 启用远程访问（推荐）
const agent = new AgentOverChromeBridge({
  allowRemoteAccess: true, // 监听 0.0.0.0:3766
});

// 或指定特定网卡
const agent = new AgentOverChromeBridge({
  host: '192.168.1.100',
  port: 3766,
});
```

**Client 端（Chrome 插件）**

1. 打开插件的 Bridge Mode 页面
2. 在 “Bridge Server URL” 输入框中填写服务器地址
    - 本地：`ws://localhost:3766`
    - 远程：`ws://192.168.1.100:3766`（替换成你的服务器 IP）
3. 点击 “Allow Connection” 按钮

<p align="center">
  <img src="/bridge_remote_config.png" alt="bridge remote config" width="400"/>
</p>

:::warning 安全提示

开启远程访问后 Bridge Server 将暴露在网络中，请确保：
- 仅在可信网络环境使用
- 使用防火墙限制访问
- 不要在公网场景开启，避免安全风险

:::

## FAQ

- **模型配置（如 `MIDSCENE_MODEL_API_KEY`）应该配置在浏览器还是终端？**

  使用桥接模式时，请在终端（Node.js 环境）中配置模型参数。更多配置信息请参考[模型策略](./model-strategy)文档。

## 更多

- 更多 Agent 的 API 请参考 [API 参考](./api#interaction-methods)。
- 完整的 Chrome 桥接 API 可参阅 [API 参考（Web）](./web-api-reference#chrome-bridge-agent)。
- 样例项目
    - 桥接模式示例：[https://github.com/web-infra-dev/midscene-example/blob/main/bridge-mode-demo](https://github.com/web-infra-dev/midscene-example/blob/main/bridge-mode-demo)



---
url: /zh/caching.md
---

# 缓存 AI 规划和定位

Midscene 支持缓存 Plan 的步骤与匹配到的元素位置信息，减少 AI 模型的调用次数，从而大幅提升执行效率。请注意，DOM 元素缓存仅在 Web 自动化任务中支持。

**效果**

当缓存命中时，脚本的执行时间会显著降低。例如在如下案例中，执行耗时从51秒降低到了28秒。

* **before**

![](/cache/no-cache-time.png)

* **after**

![](/cache/use-cache-time.png)

## 缓存文件和存储

Midscene 的缓存机制基于输入的稳定性和输出的可复用性。当相同的任务指令在相似的页面环境下重复执行时，Midscene 会优先使用已缓存的结果，避免重复调用 AI 模型，从而显著提升执行效率。

缓存的核心机制包括：
- **任务指令缓存**：对于规划类操作（如 `ai`、`aiAct`），Midscene 会将 prompt 指令作为缓存键，存储 AI 返回的执行计划
- **元素定位缓存**：对于定位类操作（如 `aiLocate`、`aiTap`），系统会将定位 prompt 作为缓存键，存储元素的 XPath 信息，下次执行时先验证 XPath 是否仍然有效
- **失效机制**：当缓存失效时，系统会自动回退到 AI 模型重新分析
- **永不缓存查询结果**：查询类操作（如 `aiBoolean`、`aiQuery`、`aiAssert`）不会被缓存

缓存内容会保存到 `./midscene_run/cache` 目录下，以 `.cache.yaml` 为扩展名。

如果缓存未命中，Midscene 将会重新调用 AI 模型，并更新缓存文件。

## 缓存策略

通过配置 `cache` 选项，你可以为 Agent 启用缓存。

### 禁用缓存

配置方式：`cache: false` 或不配置 `cache` 选项

完全禁用缓存功能，每次都重新调用 AI 模型。适合需要实时结果或调试时使用。默认情况下，如果不配置 `cache` 选项，缓存是禁用状态。

```javascript
// 直接创建 Agent
const agent = new PuppeteerAgent(page, {
  cache: false,
});
```

```yaml
# YAML 配置
agent:
  cache: false
```

### 读写模式

配置方式：`cache: { id: "my-cache-id" }` 或 `cache: { strategy: "read-write", id: "my-cache-id" }`

自动读取已有缓存，执行过程中自动更新缓存文件。`strategy` 的默认值是 `read-write`。

```javascript
// 直接创建 Agent - 显式设置 cache ID
const agent = new PuppeteerAgent(page, {
  cache: { id: "my-cache-id" },
});

// 显式指定 strategy
const agent = new PuppeteerAgent(page, {
  cache: { strategy: "read-write", id: "my-cache-id" },
});
```

```yaml
# YAML 配置 - 显式设置 cache ID
agent:
  cache:
    id: "my-cache-test"

# 显式指定 strategy
agent:
  cache:
    id: "my-cache-test"
    strategy: "read-write"
```

YAML 模式还支持配置 `cache: true`，自动使用文件名作为 cache ID。

### 只读，手动写入

配置方式：`cache: { strategy: "read-only", id: "my-cache-id" }`

只读取缓存，不自动写入缓存文件，需要手动调用 `agent.flushCache()` 写入缓存文件，适合生产环境，确保缓存的一致性

```javascript
// 直接创建 Agent
const agent = new PuppeteerAgent(page, {
  cache: { strategy: "read-only", id: "my-cache-id" },
});

// 需要手动写入缓存
await agent.flushCache();
```

```yaml
# YAML 配置
agent:
  cache:
    id: "my-cache-test"
    strategy: "read-only"
```

### 只写模式

配置方式：`cache: { strategy: "write-only", id: "my-cache-id" }`

只写入缓存，不读取已有缓存内容。每次执行时都会调用 AI 模型，并将结果写入缓存文件。适合初次建立缓存或更新缓存时使用。

```javascript
// 直接创建 Agent
const agent = new PuppeteerAgent(page, {
  cache: { strategy: "write-only", id: "my-cache-id" },
});
```

```yaml
# YAML 配置
agent:
  cache:
    id: "my-cache-test"
    strategy: "write-only"
```

### 兼容方式（不推荐）

通过环境变量 `MIDSCENE_CACHE=1` 配合 cacheId 配置，等同于读写模式。

```javascript
// 旧方式，需要 MIDSCENE_CACHE=1 环境变量和 cacheId
const agent = new PuppeteerAgent(originPage, {
  cacheId: 'puppeteer-swag-sab'
});
```

```bash
MIDSCENE_CACHE=1 tsx demo.ts
```

## 使用 Midscene 的 Playwright AI Fixture

在使用 `@midscene/web/playwright` 中的 `PlaywrightAiFixture` 时，可以通过相同的 `cache` 配置来管理缓存行为。

### 禁用缓存

```typescript
// fixture.ts in sample code
export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    cache: false,
  }),
);
```

### 读写模式

```typescript
// 对应样例代码中的 fixture.ts  
// 自动生成 cache ID（基于测试信息）
export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    cache: true,
  }),
);

// 对应样例代码中的 fixture.ts
// 显式指定 cache ID
export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    cache: { id: "my-fixture-cache" },
  }),
);
```

### 只读，手动写入

```typescript
// 对应样例代码中的 fixture.ts
export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    cache: { strategy: "read-only", id: "readonly-cache" },
  }),
);
```

在只读模式下，需要在测试步骤完成后手动将缓存写入文件。可以通过 fixture 提供的 `agentForPage` 方法获取底层 agent，然后在需要持久化的时刻调用 `agent.flushCache()`：

```typescript
test.afterEach(async ({ page, agentForPage }, testInfo) => {
  // Only flush cache if the test passed
  if (testInfo.status === 'passed') {
    console.log('Test passed, flushing Midscene cache...');
    const agent = await agentForPage(page);
    await agent.flushCache();
  } else {
    console.log(`Test ${testInfo.status}, skipping Midscene cache flush.`);
  }
});

test('manual cache flush', async ({ agentForPage, page, aiTap, aiWaitFor }) => {
  const agent = await agentForPage(page);

  await aiTap('first highlighted link in the hero section');
  await aiWaitFor('the detail page loads completely');

  await agent.flushCache();
});
```

### 只写模式

```typescript
// 对应样例代码中的 fixture.ts
export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    cache: { strategy: "write-only", id: "write-only-cache" },
  }),
);
```

在只写模式下，每次测试都会调用 AI 模型，并将结果自动写入缓存文件，不会读取已有缓存。

## 缓存清理

Midscene 支持在写入缓存时清理未使用的缓存记录，确保缓存文件保持精简。这个功能是**完全手动**的,需要显式调用 `agent.flushCache({ cleanUnused: true })`。

### 手动清理机制

当调用 `agent.flushCache({ cleanUnused: true })` 时，系统会:

1. **保留使用过的缓存**：本次运行中被匹配和使用的缓存记录会被保留
2. **保留新增的缓存**：本次运行中新生成的缓存记录会被保留
3. **删除未使用的缓存**：旧的、未被使用的缓存记录会被自动删除
4. **写入文件**：清理后的缓存会被写入文件

### 使用方式

**在测试的 afterEach 中统一调用:**

```javascript
describe('test suite', () => {
  let resetFn: () => Promise<void>;
  let agent: PuppeteerAgent;

  afterEach(async () => {
    // 清理缓存并写入文件
    if (agent) {
      await agent.flushCache({ cleanUnused: true });
    }

    // 再关闭页面
    if (resetFn) {
      await resetFn();
    }
  });

  it('test case', async () => {
    const { originPage, reset } = await launchPage('https://example.com/');
    resetFn = reset;
    agent = new PuppeteerAgent(originPage, {
      cache: { id: 'my-cache-id' },
    });

    // ... test logic
  });
});
```

**Playwright AI Fixture 用户:**

```typescript
test.afterEach(async ({ page, agentForPage }) => {
  const agent = await agentForPage(page);
  await agent.flushCache({ cleanUnused: true });
});
```

### 清理行为说明

- **read-write 模式**：调用 `flushCache({ cleanUnused: true })` 会清理并写入文件
- **read-only 模式**：调用 `flushCache({ cleanUnused: true })` 也会清理并写入文件(手动 flush 覆盖 read-only 限制)
- **write-only 模式**：不执行清理(因为不读取缓存)

**注意**：如果不传 `cleanUnused: true` 参数，`flushCache()` 只会写入文件而不会清理未使用的缓存。

## FAQ

### 没有生成缓存文件

请确认你已正确配置缓存：

1. **直接创建 Agent**: 在构造函数中设置 `cache: { id: "your-cache-id" }`
2. **Playwright AI Fixture 模式**: 在 fixture 配置中设置 `cache: true` 或 `cache: { id: "your-cache-id" }`
3. **YAML 脚本模式**: 在 YAML 文件中设置 `agent.cache.id`
4. **只读模式**: 确保调用了 `agent.flushCache()` 方法
5. **旧方式**: 设置了 `cacheId` 并启用了 `MIDSCENE_CACHE=1` 环境变量

### 如何检查缓存是否命中？

你可以查看报告文件。如果缓存命中，你将看到 `cache` 提示，并且执行时间大幅降低。

### 为什么在 CI 中无法命中缓存？

你需要在 CI 中将缓存文件提交到仓库中，并再次检查缓存命中的条件。

### 如果有了缓存，是否就不需要 AI 服务了？

不是的。

缓存是加速脚本执行的手段，但它不是确保脚本长期稳定执行的工具。我们注意到，当页面发生变化时，缓存可能会失效（例如当元素 DOM 结构发生变化时）。在缓存失效时，Midscene 仍然需要调用 AI 服务来重新执行任务。

### 如何手动删除缓存？

你可以删除 `./midscene_run/cache` 目录中的缓存文件，或者编辑缓存文件的内容。

### 如果我想禁用单个 API 的缓存，怎么办？

你可以使用 `cacheable` 选项来禁用单个 API 的缓存。

具体用法请参考对应 [API](./api.mdx) 的文档。

### 使用 XPath 缓存元素定位信息的局限性

Midscene 使用 [XPath](https://developer.mozilla.org/en-US/docs/Web/XML/XPath) 来缓存元素定位信息。我们使用相对严格的策略来防止误匹配。在以下情况下，缓存不会命中：

1. 新元素在相同的 XPath 下的文本内容与缓存元素不同。
2. 页面的 DOM 结构与缓存时的结构不同。

当缓存未命中时，Midscene 将回退到继续使用 AI 服务来查找元素。

### 获取缓存相关的调试日志

在环境变量中配置 `DEBUG=midscene:cache:*`，你可以看到缓存相关的调试日志。



---
url: /zh/changelog.md
---

# 更新日志

## v1.0 - Midscene v1.0 正式发布！

Midscene v1.0 已发布！欢迎体验，看看它如何帮助你自动化你的工作流程。

### 🚀 纯视觉路线

从 V1.0 开始，Midscene 全面转向视觉理解方案，提供更稳定可靠的 UI 自动化能力。

视觉模型有以下特点：
- **效果稳定**：业界领先的视觉模型（如 Doubao Seed 1.6、Qwen3-VL 等）表现足够稳定，已经可以满足大多数业务需求
- **UI 操作规划**：视觉模型通常具备较强的 UI 操作规划能力，能够完成不少复杂的任务流程
- **适用于任意系统**：自动化框架不再依赖 UI 渲染的技术栈。无论是 Android、iOS、桌面应用，还是浏览器中的 `<canvas>`，只要能获取截图，Midscene 即可完成交互操作
- **易于编写**：抛弃各类 selector 和 DOM 之后，开发者与模型的“磨合”会变得更简单，不熟悉渲染技术的新人也能很快上手
- **token 量显著下降**：在去除 DOM 提取之后，视觉方案的 token 使用量可以减少 80%，成本更低，且本地运行速度也变得更快
- **有开源模型解决方案**：开源模型表现渐佳，开发者开始有机会进行私有化部署模型，如 Qwen3-VL 提供的 8B、30B 等版本在不少项目中都有着不错的效果

详情请阅读我们更新版的[模型策略](./model-strategy)

### 🚀 复杂任务、长任务下的效果优化

在复杂任务、长任务下，Midscene 提供了以下优化：

- 支持多模型结合
    - 可为 Insight、Planning 额外配置更强的 AI 理解模型（如 GPT-5.1 规划 + Doubao 交互），获得最佳表现

### 🚀 运行时架构优化

* 复用部分上下文信息，减少对设备信息的调用，提升运行时性能
* 优化 Web 及移动端环境下的 Action Space 组合，向模型提供更好用的工具集

### 🚀 报告优化

* 更专业：右侧可视化展示交互参数，左侧流程展示更简洁，时间线可视化帮助快速定位问题
* 更好看：深色模式支持，元素高亮标注，模型决策过程一目了然

### 🚀 MCP 架构重构

我们重新设计了 MCP 架构，支持将 iOS / Android / Web 中的 Action Space 暴露为 MCP 服务，向上层 Agent 提供稳定可靠的 UI 操作能力，帮助开发者搭建自己的高阶 Agent。详情请阅读 [MCP 架构](./mcp)

### 🚀 移动端自动化

#### iOS 改进
- 新增 WebDriverAgent 5.x-7.x 全版本兼容
- 新增 WebDriver Clear API 支持，解决动态输入框问题
- 提升设备兼容性

#### Android 改进
- 新增截图轮询回退机制，提升远程设备稳定性
- 新增屏幕方向自动适配（displayId 截图）
- 新增 YAML 脚本 `runAdbShell` 支持

#### 跨平台
- 在 Agent 实例上暴露系统操作接口，包括 Home、Back、RecentApp 等

## V0.30 - 缓存管理升级与移动端体验优化

### 更灵活的缓存策略

v0.30 版本改进了缓存系统，让你可以根据实际需求控制缓存行为:

- **多种缓存模式可选**: 支持只读(read-only)、只写(write-only)、读写(read-write)等策略。例如在 CI 环境中使用只读模式复用缓存，在本地开发时使用只写模式更新缓存
- **自动清理无用缓存**: Agent 销毁时可自动清理未使用的缓存记录，避免缓存文件越积越多
- **配置更简洁统一**: CLI 和 Agent 的缓存配置参数已统一，无需记忆不同的配置方式

### 报告管理更便捷

- **支持合并多个报告**: 除了 playwright 场景，现在任意场景均支持将多次自动化执行的报告合并为单个文件，方便集中查看和分享测试结果

### 移动端自动化优化

#### iOS 平台改进
- **真机支持改进**: 移除了 simctl 检查限制，iOS 真机设备的自动化更流畅
- **自动适配设备显示**: 实现设备像素比自动检测，确保在不同 iOS 设备上元素定位准确

#### Android 平台增强
- **灵活的截图优化**: 新增 `screenshotResizeRatio` 选项，你可以在保证视觉识别准确性的前提下自定义截图尺寸，减少网络传输和存储开销
- **屏幕信息缓存控制**: 通过 `alwaysRefreshScreenInfo` 选项控制是否每次都获取屏幕信息，在稳定环境下可复用缓存提升性能
- **直接执行 ADB 命令**: AndroidAgent 新增 `runAdbCommand` 方法，方便执行自定义的设备控制命令

#### 跨平台一致性
- **ClearInput 全平台支持**: 解决 AI 无法准确规划各平台清空输入的操作问题

### 功能增强

- **失败分类**: CLI 执行结果现在可以区分「跳过的失败」和「真正的失败」，帮助定位问题原因
- **aiInput 追加输入**: 新增 `append` 选项，在保留现有内容的基础上追加输入，适用于编辑场景
- **Chrome 扩展改进**:
    - 弹窗模式偏好会保存到 localStorage，下次打开记住你的选择
    - Bridge 模式支持自动连接，减少手动操作
    - 支持 GPT-4o 和非视觉语言模型

### 类型安全改进

- **Zod 模式验证**: 为 action 参数引入类型检查，在开发阶段发现参数错误，避免运行时问题
- **数字类型支持**: 修复了 `aiInput` 对 number 类型值的支持，类型处理更健壮

### 问题修复

- 修复了 Playwright 循环依赖导致的潜在问题
- 修复了 `aiWaitFor` 作为首个语句时无法生成报告的问题
- 改进视频录制器延迟逻辑，确保最后的画面帧也能被捕获
- 优化报告展示逻辑，现在可以同时查看错误信息和元素定位信息
- 修复了 `aiAction` 子任务中 `cacheable` 选项未正确传递的问题

### 社区

- Awesome Midscene 板块新增 [midscene-java](./awesome-midscene.md) 社区项目

## v0.29 - 新增 iOS 平台支持

### 新增 iOS 平台支持
v0.29 版本最大的亮点是正式引入了对 iOS 平台的支持！现在，你可以通过 WebDriver 连接并自动化 iOS 设备，将 Midscene 的强大 AI 自动化能力扩展到苹果生态系统，了解详情: [支持 iOS 自动化](./ios-introduction)

### 适配 Qwen3-VL 模型

我们适配了最新的通义千问 `Qwen3-VL` 模型，开发者可以体验到更快的、更准确的视觉理解能力。详见 [模型策略](./model-strategy)

### AI 核心能力增强

- **优化 UI-TARS 模型下的表现**：优化 aiAct 规划，改进对话历史管理，提供了更好的上下文感知能力
- **优化 AI 断言与动作**：我们更新了 `aiAssert` 的提示词（Prompt）并优化了 `aiAct` 的内部实现，使 AI 驱动的断言和动作执行更加精准可靠

### 报告与调试体验优化
- **URL 参数控制回放**：为了改善调试体验，现在可以通过 URL 参数直接控制报告回放的默认行为

### 文档
- 更新了文档部署的缓存策略，确保用户能够及时访问到最新的文档内容


## v0.28 - 扩展界面操作能力，构建你自己的 GUI 自动化 Agent（预览特性）

### 支持与任意界面集成（预览特性）

v0.28 版本推出了与任意界面集成的功能。定义符合 `AbstractInterface` 定义的界面控制器类，即可获得一个功能齐全的 Midscene Agent。

该功能的典型用途是构建一个针对你自己界面的 GUI 自动化 Agent，比如 IoT 设备、内部应用、车载显示器等！

配合通用 Playground 架构和 SDK 增强功能，开发者能方便地调试自定义设备。

更多请参考 [与任意界面集成（预览特性）](./integrate-with-any-interface.mdx)

### Android 平台优化
- **规划缓存支持**：为 Android 平台添加了规划缓存功能，提升执行效率
- **输入策略增强**：基于 IME 设置优化了输入清除策略，提升 Android 平台的输入体验
- **滚动计算改进**：优化了 Android 平台的滚动终点计算算法

### 手势操作扩展
- **双击操作支持**：新增双击动作支持
- **长按与滑动手势**：新增长按和滑动手势支持

### 核心功能增强
- **Agent 配置隔离**：实现了不同 agent 间的模型配置隔离，避免配置冲突
- **在运行时设置环境变量**：为 Agent 新增 useCache 和 replanningCycleLimit 配置选项，提供更精细的控制
- **YAML 脚本支持**：支持通过 YAML 脚本运行通用的自定义设备，提升自动化能力

### 问题修复
- 修复了 Qwen 模型的搜索区域大小问题
- 优化了 deepThink 参数处理和矩形尺寸计算
- 解决了 Playwright 双击操作的相关问题
- 改进了 TEXT 动作类型的处理逻辑

### 文档与社区
- 新增自定义接口文档，帮助开发者更好地扩展功能
- 在 README 中添加了 [Awesome Midscene](./awesome-midscene.md) 板块，展示社区项目

## v0.27 - 核心模块重构，断言与报告功能全面升级

### 核心模块重构

在 v0.26 引入 [Rslib](https://github.com/web-infra-dev/rslib) 提升开发体验、降低贡献门槛的基础上，v0.27 更进一步，对核心模块进行了大规模重构。这使得扩展新设备、添加新 AI 操作的成本变得极低，我们诚挚地欢迎社区开发者踊跃贡献！

**由于本次重构涉及面较广，升级后如遇到任何问题，请随时向我们反馈，我们将第一时间跟进处理。**

### 接口优化
- **`aiAssert` 功能全面增强**
    - 新增 `name` 字段，允许为不同的断言任务命名，方便在 JSON 格式的输出结果中进行识别和解析
    - 新增 `domIncluded` 和 `screenshotIncluded` 选项，可在断言中灵活控制是否向 AI 发送 DOM 快照和页面截图

### Chrome 扩展 Playground 升级

- 所有 Agent API 都能在 Playground 上直接调试和运行！交互、提取、验证三大类方法全覆盖，可视化操作和验证，让你的自动化开发效率飙升

### 报告功能优化
- **新增标记浮层开关**：报告播放器增加了隐藏标记浮层的开关，方便用户在回放时查看无遮挡的原始页面视图

### 问题修复
- 修复了 `aiWaitFor` 在偶现错误导致报告未生成问题
- 降低 Playwright 插件的内存消耗

## v0.26 - 工具链全面接入 [Rslib](https://github.com/web-infra-dev/rslib)，大幅提高开发体验、降低贡献门槛

### Web 集成优化
- 支持冻结页面上下文（[freezePageContext](./api.mdx#agentfreezepagecontext)/[unfreezePageContext](./api.mdx#agentunfreezepagecontext)），使后续所有的操作都复用同一个页面快照，避免多次重复获取页面状态
- 为 Playwright fixture 补全所有 agent api，简化测试脚本编写，解决使用 agentForPage 无法生成报告的问题

### Android 自动化增强
- 新增隐藏键盘策略（[keyboardDismissStrategy](./integrate-with-android.html#androiddevice-的构造函数)），允许指定自动隐藏键盘的方式

### 报告功能优化
- 报告内容引入懒解析，解决大体积报告的崩溃问题
- 报告播放器新增自动缩放开关，方便查看全局视角的回放
- 支持 aiAssert / aiQuery 等任务在报告中播放，以完整展示整个页面变动过程
- 修复断言失败时的侧栏状态未显示为失败图标的问题
- 修复报告中下拉筛选器不能切换筛选的问题

### 构建与工程化
- 构建工具迁移至 [Rslib](https://github.com/web-infra-dev/rslib) 库开发工具，提升构建效率和开发体验
- 全仓库开启源码跳转，方便开发者查看源码
- MCP npm 包产物体积优化，从 56M 减少到 30M，大幅提高加载速度

### 问题修复
- CLI 在 keepWindow 为 true 时将自动开启 headed 模式
- 修复 getGlobalConfig 的实现问题，解决环境变量初始化异常问题
- 确保 base64 编码中的 mime-type 正确
- 修复 aiAssert 任务返回值类型

## v0.25 - 支持使用图像作为 AI prompt 输入

### 核心功能增强
- 新增运行环境，支持运行在 Worker 环境
- 支持使用图像作为 AI prompt 输入，详见 [使用图片作为提示词](./api.mdx#%E4%BD%BF%E7%94%A8%E5%9B%BE%E7%89%87%E4%BD%9C%E4%B8%BA%E6%8F%90%E7%A4%BA%E8%AF%8D)
- 图像处理升级，采用 Photon & Sharp 进行高效图片裁剪

### Web 集成优化
- 通过坐标获取 XPath，提高缓存可复现性
- 缓存文件将 plan 模块提到最前面，增加可读性
- Chrome Recorder 支持导出所有事件到 markdown 文档
- agent 支持指定 HTML 报告名称，详见 [reportFileName](./api.mdx)

### Android 自动化增强
- 长按手势支持
- 下拉刷新支持

### 问题修复
- 使用全局配置处理环境变量，避免因多打包导致环境无法覆盖的问题
- 当错误对象序列化失败时，手动构造错误信息
- 修复 playwright 报告类型依赖声明顺序问题
- 修复 MCP 打包问题

### 文档 AI 友好
- [LLMs.txt](./llm-txt.mdx) 区分中文与英文，方便 AI 理解
- 每篇文档顶部新增按钮，支持复制为 markdown，方便喂给 AI 使用

### 其它功能增强
- Chrome Recorder 支持 aiScroll 功能
- 重构 aiAssert 使其与 aiBoolean 实现一致

## v0.24 - Android 自动化支持 MCP 调用

### Android 自动化支持 MCP 调用
- Android 自动化已全面支持 MCP 调用，为 Android 开发者提供更完善的自动化工具集。详情请参考：[MCP 服务](./mcp)

### 优化输入清空机制
- 针对 Mac 平台的 Puppeteer 增加了双重输入清空机制，保证输入之前清空输入框

### 开发体验
- 简化本地构建 `htmlElement.js` 的方式，避免循环依赖导致的报告模板构建问题
- 优化了开发工作流，只需要执行 `npm run dev` 即可进入 Midscene 工程开发


## v0.23 - 全新报告样式与 YAML 脚本能力增强

### 报告系统升级

#### 全新报告样式
- 重新设计的测试报告界面，提供更清晰、更美观的测试结果展示
- 优化报告布局和视觉效果，提升用户阅读体验
- 增强报告的可读性和信息层次结构

![](https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/new%20report.png)

### YAML 脚本能力增强

#### 支持多 YAML 文件批量执行
- 新增配置模式，支持配置 YAML 文件运行顺序、浏览器复用策略、并行度
- 支持获取 JSON 格式的运行结果

![](https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/Tuji_20250722_161353.338.png)

### 测试覆盖提升

#### Android 测试增强

- 新增 Android 平台相关测试用例，提升代码质量和稳定性
- 完善测试覆盖率，确保 Android 功能的可靠性

## v0.22 - Chrome 扩展录制功能上线

### Web集成增强

#### 全新的录制功能
- Chrome 扩展新增录制功能，可以记录用户在页面上的操作并生成自动化脚本
- 支持录制点击、输入、滚动等常见操作，大大降低自动化脚本编写门槛
- 录制的操作可以直接在 Playground 中回放和调试

#### 存储升级到 IndexedDB
- Chrome 扩展的 Playground 和 Bridge 改为使用 IndexedDB 进行数据存储
- 相比之前的存储方案，提供更大的存储容量和更好的性能
- 支持存储更复杂的数据结构，为未来功能扩展奠定基础

#### 自定义重新规划循环限制
- 设置 `MIDSCENE_REPLANNING_CYCLE_LIMIT` 环境变量，可以自定义在执行操作(aiAct)时允许的最大重新规划循环次数
- 默认值为 10，当 AI 需要重新规划超过这个限制时，会抛出错误建议将任务拆分
- 提供更灵活的任务执行控制，适应不同复杂度的自动化场景
```bash
export MIDSCENE_REPLANNING_CYCLE_LIMIT=10 # 默认值为 10
```

### Android 功能增强

#### 截图路径区分

- 为每个截图生成唯一的文件路径，避免文件覆盖问题
- 提升了并发测试场景下的稳定性

## v0.21 - Chrome 扩展界面升级

### Web集成增强

#### 全新的 Chrome 扩展界面
- 全新的聊天式用户界面设计，提供更好的使用体验
- 界面布局优化，操作更加直观便捷

<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/recording_2025-07-07_08-16-16.mp4" controls/>

#### 超时配置灵活性提升
- 支持从测试 fixture 中覆盖超时设置，提供更灵活的超时控制
- 适用场景：不同测试用例需要不同超时时间的场景

#### 统一 Puppeteer 和 Playwright 配置
- 为 Playwright 新增 `waitForNavigationTimeout` 和 `waitForNetworkIdleTimeout` 参数
- 统一了 Puppeteer 和 Playwright 的 timeout 选项配置，提供一致的 API 体验，降低学习成本

#### 新增数据导出回调机制
- 新增 `agent.onDumpUpdate` 回调函数，可在数据导出时获得实时通知
- 重构了任务结束后的处理流程，确保异步操作的正确执行
- 适用场景：需要监控或处理导出数据的场景

### Android 交互优化
#### 输入体验改进
- 将点击输入改为滑动操作，提升交互响应性和稳定性
- 减少因点击不准确导致的操作失败

## v0.20 - 支持传入 XPath 定位元素

### Web集成增强
#### 新增 aiAsk 方法
- 可直接向 AI 模型提问，获取当前页面的字符串形式答案
- 适用场景：页面内容问答、信息提取等需要 AI 推理的任务
- 示例：

```typescript
await agent.aiAsk('问题描述')
```

#### 支持传入 XPath 定位元素
- 定位优先级：指定的 XPath > 缓存 > AI 大模型定位
- 适用场景：已知元素 XPath，需要跳过 AI 大模型定位
- 示例：

```typescript
await agent.aiTap('提交按钮', { xpath: '//button[@id="submit"]' })
```

### Android 改进
#### Playground 任务可取消
- 支持中断正在执行的自动化任务，提升调试效率

#### aiLocate API 增强
- 返回设备像素比（Device Pixel Ratio），通常用于计算元素真实坐标

### 报告生成优化
改进报告生成机制，从批量存储改为单次追加，有效降低内存占用，避免用例数量大时造成的内存溢出

## v0.19 - 支持获取完整的执行过程数据

### 新增 API 获取 Midscene 执行过程数据

为 agent 添加 `_unstableLogContent` API，即可获取 Midscene 执行过程数据，比如每个步骤的耗时、AI Tokens 消耗情况、页面截图等！

对了，Midscene 的报告就是根据这份数据生成了，也就是说，使用这份数据，你甚至可以定制一个属于你自己的报告！

详情请参考：[API 文档](./api.mdx#agent_unstablelogcontent)

### CLI 新增参数支持调整 Midscene 环境变量优先级

默认情况下，`dotenv` 不会覆盖 `.env` 文件中同名的全局环境变量。如果希望覆盖，你可以使用 `--dotenv-override` 选项。

详情请参考：[使用 YAML 格式的自动化脚本](./automate-with-scripts-in-yaml.mdx#%E4%BD%BF%E7%94%A8-env-%E4%B8%AD%E7%9A%84%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F%E8%A6%86%E7%9B%96%E5%90%8C%E5%90%8D%E7%9A%84%E5%85%A8%E5%B1%80%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)

### 大幅减少报告文件大小

裁剪生成的报告中冗余的数据，大幅减少复杂页面的报告文件大小，用户的典型复杂页面报告大小从 47.6M 减小到 15.6M！

## v0.18 - 回放报告功能增强

🚀 Midscene 又有更新啦！为你带来高质量的 UI 自动化体验。

### 在报告中增加自定义节点

* 为 agent 添加 `recordToReport` API，将当前页面的截图作为报告节点。支持设置节点标题和描述，使报告内容更加丰富。适用于关键步骤截图记录、错误状态捕获、UI 验证等。

![](/blog/recordToReport-api.png)

* 示例：

```typescript
test('login github', async ({ ai, aiAssert, aiInput, recordToReport }) => {
  if (CACHE_TIME_OUT) {
    test.setTimeout(200 * 1000);
  }
  await ai('Click the "Sign in" button');
  await aiInput('quanru', 'username');
  await aiInput('123456', 'password');

  // 自定义记录
  await recordToReport('Login page', {
    content: 'Username is quanru, password is 123456',
  });

  await ai('Click the "Sign in" button');
  await aiAssert('Login success');
});
```



### 支持将报告下载为视频

* 支持从报告播放器直接导出视频，点击播放器界面的下载按钮即可保存。

![](/blog/export-video.png)

* 适用场景：分享测试结果、存档重现步骤、演示问题复现



### Android 暴露更多配置

* 支持使用远程 adb 主机，配置键盘策略

    * `autoDismissKeyboard?: boolean` - 可选参数，是否在输入文本后自动关闭键盘

    * `androidAdbPath?: string` - 可选参数，用于指定 adb 可执行文件的路径

    * `remoteAdbHost?: string` - 可选参数，用于指定远程 adb 主机

    * `remoteAdbPort?: number` - 可选参数，用于指定远程 adb 端口

* 示例：

```typescript
await agent.aiInput('搜索框', '测试内容', { autoDismissKeyboard: true })
```

```typescript
const agent = await agentFromAdbDevice('s4ey59', {
    autoDismissKeyboard: false, // 可选参数，是否在输入文本后自动关闭键盘。默认值为 true。
    androidAdbPath: '/usr/bin/adb', // 可选参数，用于指定 adb 可执行文件的路径
    remoteAdbHost: '192.168.10.1', // 可选参数，用于指定远程 adb 主机
    remoteAdbPort: '5037' // 可选参数，用于指定远程 adb 端口
})
```

立即升级版本，体验这些强大新功能！

* [自定义报告节点 API 文档](/zh/api.mdx#agentlogscreenshot)
* [Android 更多配置项 API 文档](/zh/integrate-with-android.mdx#androiddevice-%E7%9A%84%E6%9E%84%E9%80%A0%E5%87%BD%E6%95%B0)


## v0.17 - 让 AI 看见页面 DOM

### 数据查询 API 全面增强

为满足更多自动化和数据提取场景，以下 API 新增了 options 参数，支持更灵活的 DOM 信息和截图传递：

- `agent.aiQuery(dataDemand, options)`
- `agent.aiBoolean(prompt, options)`
- `agent.aiNumber(prompt, options)`
- `agent.aiString(prompt, options)`

#### 新增 `options` 参数

- `domIncluded`：是否向模型发送精简后的 DOM 信息，默认值为 false。一般用于提取 UI 中不可见的属性，比如图片的链接。
- `screenshotIncluded`：是否向模型发送截图。默认值为 true。

#### 代码示例

```typescript
// 提取通讯录中所有联系人的完整信息（包含隐藏的头像链接）
const contactsData = await agent.aiQuery(
  "{name: string, id: number, company: string, department: string, avatarUrl: string}[], extract all contact information including hidden avatarUrl attributes",
  { domIncluded: true }
);

// 检查通讯录中第一个联系人的 id 属性是否为 1
const isId1 = await agent.aiBoolean(
  "Is the first contact's id is 1?",
  { domIncluded: true }
);

// 获取第一个联系人的 ID（隐藏属性）
const firstContactId = await agent.aiNumber("First contact's id?", { domIncluded: true });

// 获取第一个联系人的头像 URL（页面上不可见的属性）
const avatarUrl = await agent.aiString(
  "What is the Avatar URL of the first contact?",
  { domIncluded: true }
);
```

### 新增右键点击能力

你有没有遇到过需要自动化右键操作的场景？现在，Midscene 支持了全新的 `agent.aiRightClick()` 方法！

#### 功能

使用右键点击页面元素，适用于那些自定义了右键事件的场景。注意：Midscene 无法与浏览器原生菜单交互。

#### 参数说明

- `locate`: 用自然语言描述你要操作的元素
- `options`: 可选，支持 `deepThink`（AI精细定位）、`cacheable`（结果缓存）

#### 示例

```typescript
// 在通讯录应用中右键点击联系人，触发自定义上下文菜单
await agent.aiRightClick("Alice Johnson", { deepThink: true });

// 然后可以点击菜单中的选项
await agent.aiTap("Copy Info"); // 复制联系人信息到剪贴板
```


### 示例及其报告

#### 示例页面

<iframe src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/contacts3.html" width="100%" height="800"></iframe>

#### 示例报告

<iframe src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/puppeteer-2025-06-04_20-41-45-be8ibktz.html" width="100%" height="800"></iframe>


### 一个完整示例

在下面的报告文件中，我们展示了一个完整的示例，展示了如何使用新的 `aiRightClick` API 和新的查询参数来提取包含隐藏属性的联系人数据。

报告文件：[puppeteer-2025-06-04_20-41-45-be8ibktz.html](https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/puppeteer-2025-06-04_20-41-45-be8ibktz.html)

对应代码可以参考我们的示例仓库：[puppeteer-demo/extract-data.ts](https://github.com/web-infra-dev/midscene-example/blob/main/puppeteer-demo/extract-data.ts)

### 重构缓存能力

使用 xpath 缓存，而不是基于坐标，提高缓存命中概率。

缓存文件格式使用 yaml 替换 json，提高可读性。

## v0.16 - 支持 MCP

### Midscene MCP

🤖 使用 Cursor / Trae 帮助编写测试用例。
🕹️ 快速实现浏览器操作，媲美 Manus 平台。
🔧 快速集成 Midscene 能力，融入你的平台和工具。

了解详情: [MCP](./mcp)

### 支持结构化 API

APIs: `aiBoolean`, `aiNumber`, `aiString`, `aiLocate`

了解详情: [使用结构化 API 优化自动化代码](./use-javascript-to-optimize-ai-automation-code.md)

## v0.15 - Android 自动化上线！

### Android 自动化上线！

🤖 AI 调试：自然语言调试
📱 支持原生、Lynx 和 WebView 应用
🔁 可回放运行
🛠️ YAML 或 JS SDK
⚡ 自动规划 & 即时操作 API

### 更多功能

* 支持自定义 midscene_run 目录
* 增强报告文件名生成，支持唯一标识符和分段模式
* 增强超时配置和日志记录，支持网络空闲和导航超时
* 适配 gemini-2.5-pro

了解详情: [支持 Android 自动化](./android-introduction)

## v0.14 - 即时操作 API

### 即时操作 API

* 新增即时操作 API，增强 AI 操作的准确性

了解详情: [即时操作 API](./blog-introducing-instant-actions-and-deep-think.md)

## v0.13 - 深度思考模式

### 原子 AI 交互方法

* 支持 aiTap, aiInput, aiHover, aiScroll, aiKeyboardPress 等原子操作

### 深度思考模式

* 增强点击准确性，提供更深层次的上下文理解

![](/blog/0.13.jpeg)

## v0.12 - 集成 Qwen 2.5 VL

### 集成 Qwen 2.5 VL 的本地能力

* 保持输出准确性
* 支持更多元素交互
* 成本降低 80% 以上

## v0.11.0 - UI-TARS 模型缓存

### ** UI-TARS 模型支持缓存**

* 通过文档开启缓存 👉: [开启缓存](./caching.mdx)

* 开启效果

<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/antd-form-cache.mp4" controls/>


![](/blog/0.11.0.png)

### ** 优化 DOM 树提取策略**

* 优化了 dom 树的信息能力，加速了 GPT 4o 等模型的推理过程

![](/blog/0.11.0-2.png)


## v0.10.0 - UI-TARS 模型上线

UI-TARS 是由 **Seed** 团队开源的 Native GUI agent 模型。UI-TARS 起名源之[星际穿越](https://zh.wikipedia.org/zh-cn/%E6%98%9F%E9%99%85%E7%A9%BF%E8%B6%8A)电影中的 [TARS 机器人](https://interstellarfilm.fandom.com/wiki/TARS)，它具备高度的智能和自主思考能力。UI-TARS **将图片和人类指令作为输入信息**，可以正确的感知下一步的行动，从而逐渐接近人类指令的目标，在 GUI 自动化任务的各项基准测试中均领先于各类开源模型、闭源商业模型。

![](/blog/0.10.0.png)

UI-TARS:Pioneering Automated GUI Interaction with Native Agents - Figure 1

![](/blog/0.10.0-2.png)

UI-TARS:Pioneering Automated GUI Interaction with Native - Figure 4

### 模型优势

UI-TARS 模型在 GUI 任务中有以下优势：


* **目标驱动**

* **推理速度快**

* **Native GUI agent 模型**

* **模型开源**

* **公司内部私有化部署无数据安全问题**


## v0.9.0 - 桥接模式上线！

通过 Midscene 浏览器插件，你可以用脚本联动桌面浏览器进行自动化操作了！

我们把它命名为“桥接模式”（Bridge Mode）。


相比于之前各种 CI 环境调试，优势在于：

1. 可以复用桌面浏览器，尤其是 Cookie、登录态、前置界面状态等，即刻开启自动化，而不用操心环境搭建

2. 支持人工与脚本配合操作界面，提升自动化工具的灵活性

3. 简单的业务回归，Bridge Mode 本地跑一下就行

![](/blog/0.9.0.png)

文档：[通过 Chrome 插件快速体验](./bridge-mode.mdx)

## v0.8.0 - Chrome 插件

### ** 新增 Chrome 插件，任意页面随时运行 Midscene**

通过 Chrome 插件，你可以零代码、任意页面随时运行 Midscene，体验它的 Action \ Query \ Assert 等能力。

体验方式：[ 使用 Chrome 插件体验 Midscene](./quick-experience.mdx)

<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/Midscene_extension.mov" controls/>


## v0.7.0 - Playground 能力

### ** 新增 Playground 能力，随时发起调试**

再也不用频繁重跑脚本调试 Prompt 了！

在全新的测试报告页上，你可以随时对 AI 执行结果进行调试，包括页面操作、页面信息提取、页面断言。

<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/midscene-playground.mov" controls/>


## v0.6.0 - 支持字节豆包模型

### ** 模型：**支持字节豆包模型

全新支持调用豆包模型调用，参考下方环境变量即可体验。

```bash
MIDSCENE_OPENAI_INIT_CONFIG_JSON='{"baseURL":"https://xxx.net/api/v3","apiKey":"xxx"}'
MIDSCENE_MODEL_NAME='ep-20240925111815-mpfz8'
MIDSCENE_MODEL_TEXT_ONLY='true'
```

总结目前豆包模型的可用性：

* 目前豆包只有纯文本模型，也就是“看”不到图片。在纯粹通过界面文本进行推理的场景中表现尚可。

* 如果用例需要结合分析界面 UI，它完全不可用



举例：

✅ 多肉葡萄的价格 (可以通过界面文字的顺序猜出来)

✅ 切换语言文本按钮(可以是:中文，英文文本) (可以通过界面文字内容猜出来)

❌ 左下角播放按钮 (需要图像理解，失败)



### 模型：支持 GPT-4o 结构化输出、成本继续下降

通过使用 gpt-4o-2024-08-06 模型，Midscene 已支持结构化输出（structured-output）特性，确保了稳定性增强、成本下降了 40%+。

Midscene 现已支持命中 GPT-4o prompt caching 特性，待公司 GPT 平台跟进部署后，AI 调用成本将继续下降。



### 测试报告：支持动画回放

现在你可以在测试报告中查看每个步骤的动画回放，快速调试自己的运行脚本

<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/midscene-play-all.mp4" controls/>



### 提速：合并执行流程，响应提速 30%

新版本中，我们将 Plan 和 Locate 操作在 prompt 执行上进行一定程度合并，使得 AI 响应速度提升  30%

> Before

![](/blog/0.6.0.png)

> after

![](/blog/0.6.0-2.png)



### 测评报告：不同模型在 Midscene 场景下的表现

* GPT 4o 系列模型，接近 100% 正确率

* doubao-pro-4k 纯文本模型，接近可用状态

![](/blog/0.6.0-3.png)

![](/blog/0.6.0-4.png)



### 问题修复

优化了页面信息提取，避免遮挡元素被收集，以此优化成功率、速度、AI 调用成本 🚀

> before

![](/blog/0.6.0-5.png)

> after

![](/blog/0.6.0-6.png)


## v0.5.0 - 支持 GPT-4o 结构化输出

### 新功能

* 支持了 gpt-4o-2024-08-06 模型提供 100% JSON 格式限制，降低了 Midscene 任务规划时的幻觉行为

![](/blog/0.5.0.png)

* 支持了 Playwright AI 行为实时可视化，提升排查问题的效率

![](/blog/0.5.0-2.png)

* 缓存通用化，缓存能力不再仅仅局限于 playwright，pagepass、puppeteer 都可以使用缓存

```diff
- playwright test --config=playwright.config.ts
# 开启缓存
+ MIDSCENE_CACHE=true playwright test --config=playwright.config.ts
```

* 支持了  azure openAI 的调用方式

* 支持了 AI 对于 Input 现有基础之上的增删改行为

### 问题修复

* 优化了对于非文本、input、图片元素的识别，提升 AI 任务正确性

* 在 AI 交互过程中裁剪了不必要的属性字段，降低了 token 消耗

* 优化了 KeyboardPress、Input 事件在任务规划时容易出现幻觉的情况

* 针对 pagepass 通过 Midscene 执行过程中出现的闪烁行为，提供了优化方案

```javascript
// 目前 pagepass 依赖的 puppeteer 版本太低，截图可能会导致界面闪动、光标丢失，通过下面方式可以解决
const originScreenshot = puppeteerPage.screenshot;
puppeteerPage.screenshot = async (options) => {
  return await originScreenshot.call(puppeteerPage, {
    ...options,
    captureBeyondViewport: false
  });
};
```

## v0.4.0 - 支持使用 Cli

### 新功能

* Midscene 支持 Cli 的使用方式，降低 Midscene 使用门槛

```bash
# headed 模式（即可见浏览器）访问 baidu.com 并搜索“天气”
npx @midscene/cli --headed --url https://www.baidu.com --action "输入 '天气', 敲回车" --sleep 3000

# 访问 Github 状态页面并将状态保存到 ./status.json
npx @midscene/cli --url https://www.githubstatus.com/ \
  --query-output status.json \
  --query '{serviceName: string, status: string}[], github 页面的服务状态，返回服务名称'
```

* 支持 AI 执行等待能力，让 AI 等到某个时候继续后续任务执行

* Playwright AI 任务报告展示整体耗时，并按测试组进行聚合 AI 任务

### 问题修复

* 修复 AI 在连续性任务时容易出现幻觉导致任务规划失败



## v0.3.0 - 支持 AI HTML 报告

### 新功能

* AI 报告 html 化，将测试报告按测试组聚合，方便测试报告分发

### 问题修复

* 修复 AI 报告滚动预览问题



## v0.2.0 - 通过自然语言控制 puppeteer

### 新功能

* 支持通过自然语言控制 puppeteer 实现页面操作自动化🗣️💻

* 在 playwright 框架中提供 AI 缓存能力，提高稳定性和执行效率

* AI 报告可视化按照测试组进行合并，优化聚合展示

* 支持 AI 断言能力，让 AI 判断页面是否满足某种条件





## v0.1.0 - 通过自然语言控制 playwright

### 新功能

* 通过自然语言控制 playwright 实现页面操作自动化 🗣️💻

* 通过自然语言提取页面信息 🔍🗂️

* AI 报告，AI 行为、思考可视化 🛠️👀

* 直接使用 GPT-4o 模型，无需任何训练 🤖🔧



---
url: /zh/command-line-tools.md
---



# 命令行工具

Midscene 定义了一种 YAML 格式的脚本，方便开发者快速编写自动化脚本，并提供了对应的命令行工具来快速执行这些脚本。

举例来说，你可以编写如下 YAML 格式脚本示例：

```yaml
web:
  url: https://www.bing.com

tasks:
  - name: 搜索天气
    flow:
      - ai: 搜索 "今日天气"
      - sleep: 3000
      - aiAssert: 结果显示天气信息
```

并通过一条命令来执行它：

```bash
midscene ./bing-search.yaml
```

命令行会输出执行进度，并在完成后生成可视化报告。整个运行过程大幅简化了开发者做环境配置的复杂度。

本文将介绍如何使用 Midscene 的命令行工具。关于更多 YAML 格式脚本的内容，可以参考 [使用 YAML 格式的自动化脚本](./automate-with-scripts-in-yaml)。

## 使用 `.env` 配置环境变量

Midscene 命令行工具使用 [dotenv](https://www.npmjs.com/package/dotenv) 来加载 `.env` 文件。你可以在工具运行目录下创建一个 `.env` 文件，并添加以下配置：

```ini filename=.env
MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
MIDSCENE_MODEL_NAME="替换为你的模型名称"
MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考[模型策略](./model-strategy)文档。

请注意：

* 这个文件不是必须的，你也可以通过全局环境变量的形式来配置
* 请注意这里没有 `export` 前缀，这是 dotenv 库的约定
* `.env` 文件必须放置在**工具运行目录**下，而与 YAML 文件所在的目录无关。
* 这些变量默认是**不覆盖**全局环境变量中已经的同名变量的，如需修改这个策略，请参考后文“--dotenv-override” 参数
* 如需调试此部分环境变量的逻辑，可使用 `--dotenv-debug` 参数


## 开始使用

### 安装命令行工具

全局安装 `@midscene/cli` （推荐新手使用）：

```bash
npm i -g @midscene/cli
```

或在项目中按需安装

```bash
npm i @midscene/cli --save-dev
```

### 编写第一个脚本

编写一个名为 `bing-search.yaml` 的文件来驱动 Web 浏览器：

```yaml
web:
  url: https://www.bing.com

tasks:
  - name: 搜索天气
    flow:
      - ai: 搜索 "今日天气"
      - sleep: 3000
      - aiAssert: 结果显示天气信息
```

驱动 已连接 adb 的 Android 设备：

```yaml
android:
  # launch: https://www.bing.com
  deviceId: s4ey59 # device id 可以在 adb 命令行中通过 `adb devices` 命令获取

tasks:
  - name: 搜索天气
    flow:
      - ai: 打开浏览器并访问 bing.com
      - ai: 搜索 "今日天气"
      - sleep: 3000
      - aiAssert: 结果显示天气信息
```

或者驱动配置好 WebDriverAgent 的 iOS 设备：

```yaml
ios:
  # launch: com.apple.mobilesafari
  wdaPort: 8100

tasks:
  - name: 搜索天气
    flow:
      - ai: 打开浏览器并访问 bing.com
      - ai: 搜索 "今日天气"
      - sleep: 3000
      - aiAssert: 结果显示天气信息
```

### 运行脚本

```bash
midscene ./bing-search.yaml
# 如果在项目中安装了 Midscene
npx midscene ./bing-search.yaml
```

命令行会输出执行进度，并在完成后生成可视化报告。

## 命令行工具的高级用法

### 在 `.yaml` 中使用环境变量来填入动态值

脚本中可以通过 `${variable-name}` 引用环境变量。

```ini filename=.env
topic=weather today
```

```yaml
# ...
- ai: 在输入框中输入 ${topic}
# ...
```

### 运行多个脚本

`@midscene/cli` 支持使用通配符匹配多个脚本来批量执行脚本，这相当于 `--files` 参数的简写。

```bash
# 运行单个脚本
midscene ./bing-search.yaml

# 使用通配符模式运行所有匹配的脚本
midscene './scripts/**/*.yaml'
```

### 分析命令行运行结果

执行完成后，输出目录会包含：

- `--summary` 指定的 JSON 报告（默认 `index.json`），记录所有脚本的执行状态与统计数据。
- 每个 YAML 文件对应的独立执行结果（JSON 格式）。
- 每个脚本生成的可视化报告（HTML 格式）。


### 运行在可视化（Headed）模式

> 仅适用于 `web` 场景

Headed 模式会打开浏览器窗口。默认情况下脚本在无头模式运行。

```bash
# 运行在 headed 模式
midscene /path/to/yaml --headed

# 运行在 headed 模式并在结束后保留窗口
midscene /path/to/yaml --keep-window
```

### 使用桥接模式

> 仅适用于 `web` 场景

使用桥接模式可以让 YAML 脚本驱动现有的桌面浏览器，便于复用 Cookies、插件或已有状态。先安装 Chrome 扩展，然后在 `web` 配置中加入：

```diff
web:
  url: https://www.bing.com
+ bridgeMode: newTabWithUrl
```

更多细节请参阅 [通过 Chrome 插件桥接模式](./bridge-mode)。

### 使用 JavaScript 运行 YAML 脚本

调用 Agent 的 [`runYaml`](./api.html#runyaml) 方法同样可以在 JavaScript 中执行 YAML，注意该方法只会运行脚本中的 `tasks` 部分。

## 命令行参数

命令行工具提供了多项参数，用于控制脚本的执行行为：

- `--files <file1> <file2> ...`：指定脚本文件列表。默认按顺序执行（`--concurrent` 为 `1`），可通过 `--concurrent` 设置并发数量。支持 [glob](https://www.npmjs.com/package/glob) 通配符语法。
- `--concurrent <number>`：设置并发执行的数量，默认 `1`。
- `--continue-on-error`：启用后，即使某个脚本失败也会继续执行后续脚本。默认关闭。
- `--share-browser-context`：在多个脚本之间共享浏览器上下文（Cookies、`localStorage` 等），适合需要连续登录态的场景。默认关闭。
- `--summary <filename>`：指定生成的 JSON 总结报告路径。
- `--headed`：在带界面的浏览器中运行脚本，而非默认的无头模式。
- `--keep-window`：脚本执行完成后保持浏览器窗口，会自动开启 `--headed` 模式。
- `--config <filename>`：指定配置文件，文件中的参数会作为命令行参数的默认值。
- `--web.userAgent <ua>`：设置浏览器 UA，覆盖所有脚本中的 `web.userAgent`。
- `--web.viewportWidth <width>`：设置浏览器视口宽度，覆盖所有脚本中的 `web.viewportWidth`。
- `--web.viewportHeight <height>`：设置浏览器视口高度，覆盖所有脚本中的 `web.viewportHeight`。
- `--android.deviceId <device-id>`：设置安卓设备 ID，覆盖所有脚本中的 `android.deviceId`。
- `--ios.wdaPort <port>`：设置 WebDriverAgent 端口，覆盖所有脚本中的 `ios.wdaPort`。
- `--ios.wdaHost <host>`：设置 WebDriverAgent 主机地址，覆盖所有脚本中的 `ios.wdaHost`。
- `--dotenv-debug`：开启 dotenv 的调试日志，默认关闭。
- `--dotenv-override`：允许 dotenv 覆盖同名的全局环境变量，默认关闭。

示例：

使用 `--files` 指定执行顺序：

```bash
midscene --files ./login.yaml ./buy/*.yaml ./checkout.yaml
```

以 4 个并发执行所有脚本，并在出错时继续运行：

```bash
midscene --files './scripts/**/*.yaml' --concurrent 4 --continue-on-error
```

### 通过文件编写命令行参数

可以把参数写到 YAML 配置文件中，并通过 `--config` 引用。命令行传入的参数优先级高于配置文件。

```yaml
files:
  - './scripts/login.yaml'
  - './scripts/search.yaml'
  - './scripts/**/*.yaml'

concurrent: 4
continueOnError: true
shareBrowserContext: true
```

运行方式：

```bash
midscene --config ./config.yaml
```

## 常见问题

**如何导出 JSON 格式的 Cookies？**

可以借助 [Chrome 扩展](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) 导出 Cookies。

**如何查看 dotenv 的调试日志？**

使用 `--dotenv-debug` 参数即可：

```bash
midscene /path/to/yaml --dotenv-debug=true
```



---
url: /zh/common/get-cdp-url.md
---

#### 获取 CDP WebSocket URL

你可以从多种来源获取 CDP WebSocket URL：

- **BrowserBase**：在 https://browserbase.com 注册并获取你的 CDP URL
- **Browserless**：使用 https://browserless.io 或运行你自己的实例
- **本地 Chrome**：使用 `--remote-debugging-port=9222` 参数运行 Chrome，然后使用 `ws://localhost:9222/devtools/browser/...`
- **Docker**：在 Docker 容器中运行 Chrome 并暴露调试端口



---
url: /zh/common/prepare-ios.md
---

## 准备工作

### 安装 Node.js

安装 [Node.js 18 或以上版本](https://nodejs.org/en/download/)。

### 准备 API Key

准备一个视觉语言（VL）模型的 API Key。

你可以在 [模型策略](../model-strategy) 文档中查看 Midscene.js 支持的模型和配置。

### 准备 WebDriver 服务

在开始之前，你需要先设置 iOS 开发环境：

- macOS（iOS 开发必需）
- Xcode 和 Xcode 命令行工具
- iOS 模拟器或真机设备

#### 配置环境

在使用 Midscene iOS 之前，需要先准备 WebDriverAgent 服务。

:::note 版本要求

WebDriverAgent 版本需要 **>= 7.0.0**

:::

请参考官方文档进行设置：

- **模拟器配置**：[Run Prebuilt WDA](https://appium.github.io/appium-xcuitest-driver/5.12/run-prebuilt-wda/)
- **真机配置**：[Real Device Configuration](https://appium.github.io/appium-xcuitest-driver/5.12/real-device-config/)

#### 验证环境配置

配置完成后，可以通过访问 WebDriverAgent 的状态接口来验证 服务是否启动：

**访问地址**：`http://localhost:8100/status`

**正确响应示例**：
```json
{
  "value": {
    "build": {
      "version": "10.1.1",
      "time": "Sep 24 2025 18:56:41",
      "productBundleIdentifier": "com.facebook.WebDriverAgentRunner"
    },
    "os": {
      "testmanagerdVersion": 65535,
      "name": "iOS",
      "sdkVersion": "26.0",
      "version": "26.0"
    },
    "device": "iphone",
    "ios": {
      "ip": "10.91.115.63"
    },
    "message": "WebDriverAgent is ready to accept commands",
    "state": "success",
    "ready": true
  },
  "sessionId": "BCAD9603-F714-447C-A9E6-07D58267966B"
}
```

如果能够正常访问该端点并返回类似上述的 JSON 响应，说明 WebDriverAgent 已经正确配置并运行。



---
url: /zh/common/setup-env.md
---

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。



---
url: /zh/common/start-experience.md
---

配置完成后，你可以立即开始体验 Midscene。它提供了多个关键操作 Tab：

- **Act**: 与网页进行交互，这就是自动规划（Auto Planning），对应于 `aiAct` 方法。比如
```
在搜索框中输入 Midscene，执行搜索，跳转到第一条结果
```

```
填写完整的注册表单，注意主要让所有字段通过校验
```

- **Query**: 从界面中提取 JSON 结构的数据，对应于 `aiQuery` 方法。

类似的方法还有 `aiBoolean()`, `aiNumber()`, `aiString()`，用于直接提取布尔值、数字和字符串。

```
提取页面中的用户 ID，返回 { id: string } 结构的 JSON 数据
```


- **Assert**: 理解页面，进行断言，如果不满足则抛出错误，对应于 `aiAssert` 方法。

```
页面上存在一个登录按钮，它的下方有一个用户协议的链接
```

- **Tap**: 在某个元素上点击，这就是即时操作（Instant Action），对应于 `aiTap` 方法。
```
点击登录按钮
```

> 关于自动规划（Auto Planning）和即时操作（Instant Action）的区别，请参考 [API](../api.mdx) 文档。



---
url: /zh/common/troubleshooting-llm-connectivity.md
---

## 模型服务连接问题排查

如果你想排查模型服务的连通性问题，可以使用我们示例项目中的 'connectivity-test' 文件夹：[https://github.com/web-infra-dev/midscene-example/tree/main/connectivity-test](https://github.com/web-infra-dev/midscene-example/tree/main/connectivity-test)

将你的 `.env` 文件放在 `connectivity-test` 文件夹中，然后运行 `npm i && npm run test` 来进行测试。


---
url: /zh/data-privacy.md
---

# 数据隐私

Midscene.js 是一个开源项目（GitHub: [Midscene](https://github.com/web-infra-dev/midscene/))，遵循 MIT 许可证。你可以在公开仓库中查看到所有代码。

当使用 Midscene.js 时，你的页面数据（包括截图）将直接发送到你配置的 AI 模型提供商。没有第三方平台会访问这些数据。你需要关注的是模型提供商的数据隐私政策。

如果你希望在你自己的环境中构建 Midscene.js 和它的 Chrome 扩展（而不是使用我们已发布的版本），你可以参考 [贡献指南](https://github.com/web-infra-dev/midscene/blob/main/CONTRIBUTING.md) 以找到构建说明。




---
url: /zh/faq.md
---

# 常见问题 FAQ

## 会有哪些信息发送到 AI 模型？

Midscene 会发送页面截图到 AI 模型。在某些场景下，例如调用 `aiAsk` 或 `aiQuery` 时传入 `domIncluded: true`，页面的 DOM 信息也会被发送。

如果你担心数据隐私问题，请参阅 [数据隐私](./data-privacy)。

## 如何提升运行效率？

有几种方法可以提高运行效率：
1. 使用即时操作接口，如 `agent.aiTap('Login Button')` 代替 `agent.ai('Click Login Button')`。
2. 尽量使用较低的分辨率，降低输入 token 成本。
3. 更换更快的模型服务。
4. 使用缓存来加速调试过程。更多详情请参阅 [缓存](./caching)。

## 浏览器界面持续闪动

一般是 viewport `deviceScaleFactor` 参数与系统环境不匹配造成的。如果你在 Mac 系统下运行，可以把它设成 2 来解决。

```typescript
await page.setViewport({
  deviceScaleFactor: 2,
});
```

## 如何通过链接控制报告中播放器的默认回放样式？

在报告页面的链接后添加查询参数即可覆盖 **Focus on cursor** 和 **Show element markers** 开关的默认值，决定是否在报告中聚焦鼠标位置和元素标记。使用 `focusOnCursor` 和 `showElementMarkers`，参数值支持 `true`、`false`、`1` 或 `0`，例如：`...?focusOnCursor=false&showElementMarkers=true`。

## 自定义网络超时

当在网页上执行某个操作后，Midscene 会自动等待网络空闲。这是为了确保自动化过程的稳定性。如果等待超时，不会发生任何事情。

默认的超时时间配置如下：

1. 如果是页面跳转，则等待页面加载完成，默认超时时间为 5000ms
2. 如果是点击、输入等操作，则等待网络空闲，默认超时时间为 2000ms

当然，你可以通过配置参数修改默认超时时间，或者关闭这个功能：

- 使用 [Agent](/zh/api.html#%E6%9E%84%E9%80%A0%E5%99%A8) 上的 `waitForNetworkIdleTimeout` 和 `waitForNavigationTimeout` 参数
- 使用 [Yaml](/zh/automate-with-scripts-in-yaml.html#web-%E9%83%A8%E5%88%86) 脚本和 [PlaywrightAiFixture](/zh/integrate-with-playwright.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5%E6%89%A9%E5%B1%95-test-%E5%AE%9E%E4%BE%8B) 中的 `waitForNetworkIdle` 参数

## 在 Chrome 插件中使用 Ollama 模型出现 403 错误

需要设置环境变量 `OLLAMA_ORIGINS="*"`，以允许 Chrome 插件访问 Ollama 模型。



---
url: /zh/index.md
---




---
url: /zh/integrate-with-android.md
---



# 与 Android(adb) 集成

在使用 adb 连接 Android 设备后，你可以使用 Midscene JavaScript SDK 来控制 Android 设备。

import { PackageManagerTabs } from '@theme';

:::info 样例项目

使用 JavaScript SDK 控制 Android 设备：[https://github.com/web-infra-dev/midscene-example/blob/main/android/javascript-sdk-demo](https://github.com/web-infra-dev/midscene-example/blob/main/android/javascript-sdk-demo)

与 Vitest 集成和测试：[https://github.com/web-infra-dev/midscene-example/tree/main/android/vitest-demo](https://github.com/web-infra-dev/midscene-example/tree/main/android/vitest-demo)

:::

:::info 案例展示

[查看更多案例](./android-introduction)

<p align="center">
  <img src="/android.png" alt="android" width="400" />
</p>

:::

## Preparation

### Prepare an API key

Prepare an API key from a visual-language (VL) model. You will use it later.

You can check the supported models in [Model strategy](./model-strategy)

### Install adb

`adb` is a command-line tool that allows you to communicate with an Android device. There are two ways to install `adb`:

- way 1: use [Android Studio](https://developer.android.com/studio) to install
- way 2: use [Android command-line tools](https://developer.android.com/studio#command-line-tools-only) to install

Verify adb is installed successfully:

```bash
adb --version
```

When you see the following output, adb is installed successfully:

```log
Android Debug Bridge version 1.0.41
Version 34.0.4-10411341
Installed as /usr/local/bin//adb
Running on Darwin 24.3.0 (arm64)
```

### Set environment variable `ANDROID_HOME`

Reference [Android environment variables](https://developer.android.com/tools/variables), set the environment variable `ANDROID_HOME`.

Verify the `ANDROID_HOME` variable is set successfully:

```bash
echo $ANDROID_HOME
```

When the command has any output, the `ANDROID_HOME` variable is set successfully:

```log
/Users/your_username/Library/Android/sdk
```

### Connect Android device with adb

In the developer options of the system settings, enable the 'USB debugging' of the Android device, if the 'USB debugging (secure settings)' exists, also enable it, then connect the Android device with a USB cable

<p align="center">
  <img src="/android-usb-debug-en.png" alt="android usb debug" width="400"/>
</p>

Verify the connection:

```bash
adb devices -l
```

When you see the following output, the connection is successful:

```log
List of devices attached
s4ey59	device usb:34603008X product:cezanne model:M2006J device:cezan transport_id:3
```

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


## 集成 Midscene

### 第一步：安装依赖

<PackageManagerTabs command="install @midscene/android --save-dev" />

### 第二步：编写脚本

这里以使用安卓浏览器搜索耳机为例。(当然，你也可以使用设备上的其他任何应用)

编写下方代码，保存为 `./demo.ts`

```typescript title="./demo.ts"
import {
  AndroidAgent,
  AndroidDevice,
  getConnectedDevices,
} from '@midscene/android';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
Promise.resolve(
  (async () => {
    const devices = await getConnectedDevices();
    const page = new AndroidDevice(devices[0].udid);

    // 👀 初始化 Midscene agent
    const agent = new AndroidAgent(page, {
      aiActionContext:
        '如果出现位置、权限、用户协议等弹窗，点击同意。如果出现登录页面，关闭它。',
    });
    await page.connect();

    // 👀 打开浏览器并导航到 ebay.com（请确保当前页面有浏览器 App 喔）
    await agent.aiAct('open browser and navigate to ebay.com');

    await sleep(5000);

    // 👀 输入关键词，执行搜索
    await agent.aiAct('在搜索框输入 "Headphones"，敲回车');

    // 👀 等待加载完成
    await agent.aiWaitFor('页面中至少有一个耳机商品');
    // 或者你也可以使用一个普通的 sleep:
    // await sleep(5000);

    // 👀 理解页面内容，提取数据
    const items = await agent.aiQuery(
      '{itemTitle: string, price: Number}[], 找到列表里的商品标题和价格',
    );
    console.log('耳机商品信息', items);

    // 👀 用 AI 断言
    await agent.aiAssert('界面左侧有类目筛选功能');
  })(),
);
```

### 第三步：运行

使用 `tsx` 来运行

```bash
# run
npx tsx demo.ts
```

稍等片刻，你会看到如下输出：

```log
[
 {
   itemTitle: 'JBL Tour Pro 2 - True wireless Noise Cancelling earbuds with Smart Charging Case',
   price: 551.21
 },
 {
   itemTitle: 'Soundcore Space One无线耳机40H ANC播放时间2XStronger语音还原',
   price: 543.94
 }
]
```

### 第四步：查看运行报告

当上面的命令执行成功后，会在控制台输出：`Midscene - report file updated: /path/to/report/some_id.html`，通过浏览器打开该文件即可看到报告。

## 构造函数与接口

<a id="androiddevice"></a>

### `AndroidDevice` 的构造函数

AndroidDevice 的构造函数支持以下参数：

- `deviceId: string` - 设备 id
- `opts?: AndroidDeviceOpt` - 可选参数，用于初始化 AndroidDevice 的配置
    - `autoDismissKeyboard?: boolean` - 可选参数，是否在输入文本后自动关闭键盘。默认值为 true。
    - `keyboardDismissStrategy?: 'esc-first' | 'back-first'` - 可选参数，关闭键盘的策略。'esc-first' 优先尝试 ESC 键，如果键盘仍存在则尝试返回键。'back-first' 优先尝试返回键，如果键盘仍存在则尝试 ESC 键。默认值为 'esc-first'。
    - `androidAdbPath?: string` - 可选参数，用于指定 adb 可执行文件的路径。
    - `remoteAdbHost?: string` - 可选参数，用于指定远程 adb 主机。
    - `remoteAdbPort?: number` - 可选参数，用于指定远程 adb 端口。
    - `imeStrategy?: 'always-yadb' | 'yadb-for-non-ascii'` - 可选参数，控制 Midscene 何时调用 [yadb](https://github.com/ysbing/YADB) 来输入文本。`'yadb-for-non-ascii'` 仅在输入非 ASCII 文本时启用 yadb，而 `'always-yadb'` 会在所有输入任务中都使用 yadb。如果默认配置无法正确输入文本，可尝试在这两种策略之间切换。默认值为 'yadb-for-non-ascii'。
    - `displayId?: number` - 可选参数，用于指定要使用的显示器 ID。默认值为 undefined，表示使用当前显示器。
    - `screenshotResizeScale?: number` - 可选参数，控制发送给 AI 模型的截图尺寸。默认值为 `1 / devicePixelRatio`，因此对于分辨率 1200×800、设备像素比（DPR）为 3 的界面，发送到模型的图片约为 400×267。不建议手动修改该参数。
    - `alwaysRefreshScreenInfo?: boolean` - 可选参数，是否每次都重新获取屏幕尺寸和方向信息。默认为 false（使用缓存以提高性能）。如果设备可能会旋转或需要实时屏幕信息，设置为 true。

<a id="androidagent"></a>

### Android Agent 上的更多接口

除了 [API 参考](./api.mdx) 中的通用 Agent 接口，AndroidAgent 还提供了一些其他接口：

#### `agent.launch()`

启动一个网页或原生页面。

- 类型

```typescript
function launch(uri: string): Promise<void>;
```

- 参数：

    - `uri: string` - 要打开的 uri，可以是网页 url 或原生 app 的 package name 或 activity name，如果存在 activity name，则以 / 分隔（例如：com.android.settings/.Settings）

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
import { AndroidAgent, AndroidDevice } from '@midscene/android';

const page = new AndroidDevice('s4ey59');
const agent = new AndroidAgent(page);

await agent.launch('https://www.ebay.com'); // 打开网页
await agent.launch('com.android.settings'); // 打开系统设置 app(package name)
await agent.launch('com.android.settings/.Settings'); // 打开系统设置 app(package name) 的 .Settings(activity name) 页面
```

#### `agent.runAdbShell()`

执行 `adb shell` 命令。

> 注意：该方法本质上是调用 `adb shell` 执行传入的命令。

- 类型

```typescript
function runAdbShell(command: string): Promise<string>;
```

- 参数：

    - `command: string` - 要执行的 adb shell 命令

- 返回值:

    - `Promise<string>` - 命令执行的输出结果

- 示例:

```typescript
import { AndroidAgent, AndroidDevice } from '@midscene/android';

const page = new AndroidDevice('s4ey59');
const agent = new AndroidAgent(page);
await page.connect();

const result = await agent.runAdbShell('dumpsys battery');
// 等同于执行 `adb shell dumpsys battery`
console.log(result);
```

:::info 在 YAML 脚本中使用

除了在 JavaScript/TypeScript 中使用这些方法，你还可以在 YAML 脚本中使用 Android 的平台特定动作。

要了解如何在 YAML 脚本中使用 `runAdbShell` 和 `launch` 动作，请参考 [YAML 脚本中的 Android 平台特定动作](./automate-with-scripts-in-yaml#android-部分)。

:::

#### `agent.back()`

触发系统的返回操作。

- 类型

```typescript
function back(): Promise<void>;
```

- 参数：无
- 返回值：`Promise<void>`

- 示例：

```typescript
import { agentFromAdbDevice } from '@midscene/android';

const agent = await agentFromAdbDevice();

await agent.back(); // 执行返回操作
```

#### `agent.home()`

返回到 Android 主屏幕。

- 类型

```typescript
function home(): Promise<void>;
```

- 参数：无
- 返回值：`Promise<void>`

- 示例：

```typescript
import { agentFromAdbDevice } from '@midscene/android';

const agent = await agentFromAdbDevice();

await agent.home(); // 回到桌面
```

#### `agent.recentApps()`

打开 Android 最近任务界面。

- 类型

```typescript
function recentApps(): Promise<void>;
```

- 参数：无
- 返回值：`Promise<void>`

- 示例：

```typescript
import { agentFromAdbDevice } from '@midscene/android';

const agent = await agentFromAdbDevice();

await agent.recentApps(); // 打开最近任务
```

#### `agentFromAdbDevice()`

从已连接的 adb 设备中，创建一个 AndroidAgent。

- 类型

```typescript
function agentFromAdbDevice(
  deviceId?: string,
  opts?: PageAgentOpt,
): Promise<AndroidAgent>;
```

- 参数：

    - `deviceId?: string` - 可选参数，要连接的 adb 设备 id，如果未传入，则使用第一个连接的设备
    - `opts?: PageAgentOpt & AndroidDeviceOpt` - 可选参数，用于初始化 AndroidAgent 的配置，其中 PageAgentOpt 参考 [构造器](./api.mdx)，AndroidDeviceOpt 的配置值参考 [AndroidDevice 的构造函数](./integrate-with-android#androiddevice-%E7%9A%84%E6%9E%84%E9%80%A0%E5%87%BD%E6%95%B0)

- 返回值：

    - `Promise<AndroidAgent>` 返回一个 AndroidAgent 实例

- 示例：

```typescript
import { agentFromAdbDevice } from '@midscene/android';

const agent = await agentFromAdbDevice('s4ey59'); // 传入 deviceId
const agent = await agentFromAdbDevice(); // 不传入 deviceId，则使用第一个连接的设备
```

#### `getConnectedDevices()`

获取所有连接的 Android 设备。

- 类型

```typescript
function getConnectedDevices(): Promise<Device[]>;
interface Device {
  /**
   * The device udid.
   */
  udid: string;
  /**
   * Current device state, as it is visible in
   * _adb devices -l_ output.
   */
  state: string;
  port?: number;
}
```

- 返回值：

    - `Promise<Device[]>` 返回一个 Device 数组

- 示例：

```typescript
import { agentFromAdbDevice, getConnectedDevices } from '@midscene/android';

const devices = await getConnectedDevices();
console.log(devices);
const agent = await agentFromAdbDevice(devices[0].udid);
```

## 扩展自定义交互动作

使用 `customActions` 选项，结合 `defineAction` 定义的自定义交互动作，可以扩展 Agent 的动作空间。这些动作会追加在内置动作之后，方便 Agent 在规划阶段调用。

```typescript
import { getMidsceneLocationSchema, z } from '@midscene/core';
import { defineAction } from '@midscene/core/device';
import { AndroidAgent, AndroidDevice } from '@midscene/android';

const ContinuousClick = defineAction({
  name: 'continuousClick',
  description: 'Click the same target repeatedly',
  paramSchema: z.object({
    locate: getMidsceneLocationSchema(),
    count: z
      .number()
      .int()
      .positive()
      .describe('How many times to click'),
  }),
  async call(param) {
    const { locate, count } = param;
    console.log('click target center', locate.center);
    console.log('click count', count);
    // 在这里结合 locate + count 实现自定义点击逻辑
  },
});

const page = new AndroidDevice('your-device-id');
const agent = new AndroidAgent(page, {
  customActions: [ContinuousClick],
});

await agent.aiAct('点击红色按钮五次');
```

更多关于自定义动作的细节，请参考 [集成到任意界面](./integrate-with-any-interface)。

## 更多

- 更多 Agent 上的 API 接口请参考 [API 参考](./api.mdx)。

## FAQ

### 为什么我连接了设备，但是通过 adb 仍然无法控制？

一个典型的错误信息是：
```
Error:
Exception occurred while executing 'tap':
java.lang.SecurityException: Injecting input events requires the caller (or the source of the instrumentation, if any) to have the INJECT_EVENTS permission.
```

请检查是否在系统设置的开发者选项中，如果存在『USB 调试（安全设置）』，也需要开启。

<p align="center">
  <img src="/android-usb-debug.png" alt="android usb debug" width="400" />
</p>

### 如何使用自定义的 adb 路径、远程 adb 主机和端口？

你可以使用 `MIDSCENE_ADB_PATH` 环境变量来指定 adb 可执行文件的路径，`MIDSCENE_ADB_REMOTE_HOST` 环境变量来指定远程 adb 主机，`MIDSCENE_ADB_REMOTE_PORT` 环境变量来指定远程 adb 端口。

```bash
export MIDSCENE_ADB_PATH=/path/to/adb
export MIDSCENE_ADB_REMOTE_HOST=192.168.1.100
export MIDSCENE_ADB_REMOTE_PORT=5037
```

此外，也可以通过 AndroidDevice 的构造函数来指定 adb 可执行文件的路径、远程 adb 主机和端口。

```typescript
const device = new AndroidDevice('s4ey59', {
  androidAdbPath: '/path/to/adb',
  remoteAdbHost: '192.168.1.100',
  remoteAdbPort: 5037,
});
```



---
url: /zh/integrate-with-any-interface.md
---



# 与任意界面集成

你可以使用 Midscene 的 Agent 来控制任意界面，比如 IoT 设备、内部应用、车载显示器等，只需要实现一个符合 `AbstractInterface` 定义的 UI 操作类。

在实现了 UI 操作类之后，你可以获得 Midscene Agent 的全部特性：

- TypeScript 的 GUI 自动化 Agent SDK，支持与任意界面集成
- 用于调试的 Playground
- 通过 yaml 脚本控制界面
- 暴露 UI 操作的 MCP 服务

## 演示和社区项目

我们已经为你准备了一个演示项目，帮助你学习如何定义自己的界面类。强烈建议你查看一下。

* [演示项目](https://github.com/web-infra-dev/midscene-example/tree/main/custom-interface) - 一个简单的演示项目，展示如何定义自己的界面类

* [Android (adb) Agent](https://github.com/web-infra-dev/midscene/blob/main/packages/android/src/device.ts) - 这是 Midscene Android (adb) Agent，同样依赖此特性实现

* [iOS (WebDriverAgent) Agent](https://github.com/web-infra-dev/midscene/blob/main/packages/ios/src/device.ts) - 这是 Midscene iOS (WebDriverAgent) Agent，同样依赖此特性实现

还有一些使用此功能的社区项目：

* [midscene-ios](https://github.com/lhuanyu/midscene-ios) - 使用 Midscene 驱动 "iPhone 镜像" 应用的项目

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


## 实现你自己的界面类

### 关键概念

* `AbstractInterface` 类：一个预定义的抽象类，可以连接到 Midscene 智能体
* **动作空间**：描述可以在界面上执行的动作集合。这将影响 AI 模型如何规划和执行动作

### 步骤 1. 从 demo 项目开始

我们提供了一个演示项目，运行了本文档中的所有功能。这是最快的启动方式。

```bash
# 准备项目
git clone https://github.com/web-infra-dev/midscene-example.git
cd midscene-example/custom-interface
npm install
npm run build

# 运行演示
npm run demo
```

### 步骤 2. 实现你的界面类

定义一个继承 `AbstractInterface` 类的类，并实现所需的方法。

你可以从 [`./src/sample-device.ts`](https://github.com/web-infra-dev/midscene-example/blob/main/custom-interface/src/sample-device.ts) 文件中获取示例实现。让我们快速浏览一下。

```typescript
import type { DeviceAction, Size } from '@midscene/core';
import { getMidsceneLocationSchema, z } from '@midscene/core';
import {
  type AbstractInterface,
  defineAction,
  defineActionTap,
  defineActionInput,
  // ... 其他动作导入
} from '@midscene/core/device';

export interface SampleDeviceConfig {
  deviceName?: string;
  width?: number;
  height?: number;
  dpr?: number;
}

/**
 * SampleDevice - AbstractInterface 的模板实现
 */
export class SampleDevice implements AbstractInterface {
  interfaceType = 'sample-device';
  private config: Required<SampleDeviceConfig>;

  constructor(config: SampleDeviceConfig = {}) {
    this.config = {
      deviceName: config.deviceName || 'Sample Device',
      width: config.width || 1920,
      height: config.height || 1080,
      dpr: config.dpr || 1,
    };
  }

  /**
   * 必需：截取屏幕截图并返回 base64 字符串
   */
  async screenshotBase64(): Promise<string> {
    // TODO：实现实际的屏幕截图捕获
    console.log('📸 Taking screenshot...');
    return 'data:image/png;base64,...'; // 你的屏幕截图实现
  }

  /**
   * 必需：获取界面尺寸
   */
  async size(): Promise<Size> {
    return {
      width: this.config.width,
      height: this.config.height,
      dpr: this.config.dpr,
    };
  }

  /**
   * 必需：定义 AI 模型的可用动作
   */
  actionSpace(): DeviceAction[] {
    return [
      // 基础点击动作
      defineActionTap(async (param) => {
        // TODO：实现在 param.locate.center 坐标的点击
        await this.performTap(param.locate.center[0], param.locate.center[1]);
      }),

      // 文本输入动作  
      defineActionInput(async (param) => {
        // TODO：实现文本输入
        await this.performInput(param.locate.center[0], param.locate.center[1], param.value);
      }),

      // 自定义动作示例
      defineAction({
        name: 'CustomAction',
        description: '你的自定义设备特定动作',
        paramSchema: z.object({
          locate: getMidsceneLocationSchema(),
          // ... 自定义参数
        }),
        call: async (param) => {
          // TODO：实现自定义动作
        },
      }),
    ];
  }

  async destroy(): Promise<void> {
    // TODO：清理资源
  }

  // 私有实现方法
  private async performTap(x: number, y: number): Promise<void> {
    // TODO：你的实际点击实现
  }

  private async performInput(x: number, y: number, text: string): Promise<void> {
    // TODO：你的实际输入实现  
  }
}
```

需要实现的关键方法有：
- `screenshotBase64()`、`size()`：帮助 AI 模型获取界面上下文
- `actionSpace()`：一个由 `DeviceAction` 组成的数组，定义了在界面上可以执行的动作。AI 模型将使用这些动作来执行操作。Midscene 已为常见界面与设备提供了预定义动作空间，同时也支持定义任何自定义动作。

使用这些命令运行 Agent：

- `npm run build` 重新编译 Agent 代码
- `npm run demo` 使用 JavaScript 运行智能体
- `npm run demo:yaml` 使用 yaml 脚本运行智能体


### 步骤 3. 使用 Playground 测试 Agent

为 Agent 附加一个 Playground 服务，即可在浏览器中测试你的 Agent。

```ts 
import 'dotenv/config'; // 从 .env 文件里读取 Midscene 环境变量
import { playgroundForAgent } from '@midscene/playground';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 实例化 device 和 agent
const device = new SampleDevice();
await device.launch();
const agent = new Agent(device);

// 启动 playground
const server = await playgroundForAgent(agent).launch();

// 关闭 Playground
await sleep(10 * 60 * 1000);
await server.close();
console.log('Playground 已关闭！');
```

### 步骤 4. 测试 MCP 服务

（仍在开发中）

### 步骤 5. 发布 npm 包，让你的用户使用它

`./index.ts` 文件已经导出了你的 Agent 与界面类。现在可以发布到 npm。

在 `package.json` 文件中填写 `name` 和 `version`，然后运行以下命令：

```bash
npm publish
```

你的 npm 包的典型用法如下：

```typescript
import 'dotenv/config'; // 从 .env 文件里读取 Midscene 环境变量
import { playgroundForAgent } from '@midscene/playground';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 实例化 device 和 agent
const device = new SampleDevice();
await device.launch();
const agent = new Agent(device);

await agent.aiAct('click the button');
```

### 步骤 6. 在 Midscene CLI 和 YAML 脚本中调用你的类

编写一个包含 `interface` 字段的 yaml 脚本来调用你的类：

```yaml
interface:
  module: 'my-pkg-name'
  # export: 'MyDeviceClass' # 如果是具名导出，使用该字段

config:
  output: './data.json'
```

该配置等价于：

```typescript
import MyDeviceClass from 'my-pkg-name';
const device = new MyDeviceClass();
const agent = new Agent(device, {
  output: './data.json',
});
```

YAML 的其他字段与[自动化脚本](./automate-with-scripts-in-yaml.html)文档一致。

## API 参考

### `AbstractInterface` 类

```typescript
import { AbstractInterface } from '@midscene/core';
```

`AbstractInterface` 是智能体控制界面的关键类。

以下是你需要实现的必需方法：

- `interfaceType: string`：为界面定义一个名称，这不会提供给 AI 模型
- `screenshotBase64(): Promise<string>`：截取界面的屏幕截图并返回带有 `'data:image/` 前缀的 base64 字符串
- `size(): Promise<Size>`：界面的大小和 dpr，它是一个具有 `width`、`height` 和 `dpr` 属性的对象
- `actionSpace(): DeviceAction[] | Promise<DeviceAction[]>`：界面的动作空间，它是一个 `DeviceAction` 对象数组。在这里你可以使用预定义动作，或是自定义交互操作。

类型签名：

```ts
import type { DeviceAction, Size, UIContext } from '@midscene/core';
import type { ElementNode } from '@midscene/shared/extractor';

abstract class AbstractInterface {
  // 必选
  abstract interfaceType: string;
  abstract screenshotBase64(): Promise<string>;
  abstract size(): Promise<Size>;
  abstract actionSpace(): DeviceAction[] | Promise<DeviceAction[]>;

  // 可选：生命周期/钩子
  abstract destroy?(): Promise<void>;
  abstract describe?(): string;
  abstract beforeInvokeAction?(actionName: string, param: any): Promise<void>;
  abstract afterInvokeAction?(actionName: string, param: any): Promise<void>;
}
```

以下是你可以实现的可选方法：

- `destroy?(): Promise<void>`：销毁
- `describe?(): string`：界面描述，这可能会用于报告和 Playground，但不会提供给 AI 模型
- `beforeInvokeAction?(actionName: string, param: any): Promise<void>`：在动作空间中调用动作之前的钩子函数
- `afterInvokeAction?(actionName: string, param: any): Promise<void>`：在调用动作之后的钩子函数

### 动作空间（Action Space）

动作空间是界面上可执行动作的集合。AI 模型将使用这些动作来执行操作。所有动作的描述和参数模式都会提供给 AI 模型。

为了帮助你轻松定义动作空间，Midscene 为最常见的界面和设备提供了一组预定义的动作，同时也支持定义任意自定义动作。

以下是如何导入工具来定义动作空间：

```typescript
import {
	type ActionTapParam,
	defineAction,
	defineActionTap,
} from "@midscene/core/device";
```

#### 预定义的动作

这些是最常见界面和设备的预定义动作空间。你可以通过实现动作的调用方法将它们暴露给定制化界面。

你可以在这些函数的类型定义中找到动作的参数。

* `defineActionTap()`：定义点击动作。这也是 `aiTap` 方法的调用函数。
* `defineActionDoubleClick()`：定义双击动作
* `defineActionInput()`：定义输入动作。这也是 `aiInput` 方法的调用函数。这也是 `aiInput` 方法的调用函数。
* `defineActionKeyboardPress()`：定义键盘按下动作。这也是 `aiKeyboardPress` 方法的调用函数。
* `defineActionScroll()`：定义滚动动作。这也是 `aiScroll` 方法的调用函数。
* `defineActionDragAndDrop()`：定义拖放动作
* `defineActionLongPress()`：定义长按动作
* `defineActionSwipe()`：定义滑动动作

#### 定义一个自定义动作

你可以使用 `defineAction()` 函数定义自己的动作。你也可以使用这种方式为 [PuppeteerAgent](./integrate-with-puppeteer)、[AgentOverChromeBridge](./bridge-mode#constructor) 和 [AndroidAgent](./integrate-with-android) 定义更多动作。

API 签名：

```typescript
import { defineAction } from "@midscene/core/device";

defineAction(
  {
    name: string,
    description: string,
    paramSchema: z.ZodType<T>;
    call: (param: z.infer<z.ZodType<T>>) => Promise<void>;
  }
)
```

* `name`：动作的名称，AI 模型将使用此名称调用动作
* `description`：动作的描述，AI 模型将使用此描述来理解动作的作用。对于复杂动作，你可以在这里给出更详细的示例说明
* `paramSchema`：动作参数的 [Zod](https://www.npmjs.com/package/zod) 模式，AI 模型将根据此模式帮助填充参数
* `call`：调用动作的函数，你可以从符合 `paramSchema` 的 `param` 参数中获取参数


示例：

```typescript
defineAction({
  name: 'MyAction',
  description: 'My action',
  paramSchema: z.object({
    name: z.string(),
  }),
  call: async (param) => {
    console.log(param.name);
  },
});
```

如果你想要获取某个元素位置相关的参数，可以使用 `getMidsceneLocationSchema()` 函数获取特定的 zod 模式。

一个更复杂的示例，关于如何定义自定义动作：

```typescript
import { getMidsceneLocationSchema } from "@midscene/core/device";

defineAction({
  name: 'LaunchApp',
  description: '启动屏幕上的应用',
  paramSchema: z.object({
    name: z.string().describe('要启动的应用名称'),
    locate: getMidsceneLocationSchema().describe('要启动的应用图标'),
  }),
  call: async (param) => {
    console.log(`launching app: ${param.name}, ui located at: ${JSON.stringify(param.locate.center)}`);
  },
});
```

### `playgroundForAgent` 函数

```typescript
import { playgroundForAgent } from '@midscene/playground';
```

`playgroundForAgent` 函数用于为特定的 Agent 创建一个 Playground 启动器，让你可以在浏览器中测试和调试你的自定义界面 Agent。

#### 函数签名

```typescript
function playgroundForAgent(agent: Agent): {
  launch(options?: LaunchPlaygroundOptions): Promise<LaunchPlaygroundResult>
}
```

#### 参数

- `agent: Agent`：要为其启动 Playground 的 Agent 实例

#### 返回值

返回一个包含 `launch` 方法的对象。

#### `launch` 方法选项

```typescript
interface LaunchPlaygroundOptions {
  /**
   * Playground 服务器端口
   * @default 5800
   */
  port?: number;

  /**
   * 是否自动在浏览器中打开 Playground
   * @default true
   */
  openBrowser?: boolean;

  /**
   * 自定义浏览器打开命令
   * @default macOS 使用 'open'，Windows 使用 'start'，Linux 使用 'xdg-open'
   */
  browserCommand?: string;

  /**
   * 是否显示服务器日志
   * @default true
   */
  verbose?: boolean;

  /**
   * Playground 服务器实例的唯一标识 ID
   * 同一个 ID 共用 Playground 对话历史
   * @default undefined（生成随机 UUID）
   */
  id?: string;
}
```

#### `launch` 方法返回值

```typescript
interface LaunchPlaygroundResult {
  /**
   * Playground 服务器实例
   */
  server: PlaygroundServer;

  /**
   * 服务器端口
   */
  port: number;

  /**
   * 服务器主机地址
   */
  host: string;

  /**
   * 关闭 Playground 的函数
   */
  close: () => Promise<void>;
}
```

#### 使用示例

```typescript
import 'dotenv/config';
import { playgroundForAgent } from '@midscene/playground';
import { SampleDevice } from './sample-device';
import { Agent } from '@midscene/core/agent';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 创建设备和 Agent 实例
const device = new SampleDevice();
const agent = new Agent(device);

// 启动 Playground
const result = await playgroundForAgent(agent).launch({
  port: 5800,
  openBrowser: true,
  verbose: true
});

console.log(`Playground 已启动：http://${result.host}:${result.port}`);

// 在需要时关闭 Playground
await sleep(10 * 60 * 1000); // 等待 10 分钟
await result.close();
console.log('Playground 已关闭！');
```

## 常见问题（FAQ）

**我的 interface-controller 是通用的，可以收录到本文档中吗？**

可以，我们很乐意收集有创意的项目并将它们列在本文档中。

当项目准备好后，[给我们提一个 issue](https://github.com/web-infra-dev/midscene/issues)。



---
url: /zh/integrate-with-ios.md
---



# 与 iOS(WebDriverAgent) 集成

在使用 WebDriverAgent 连接 iOS 设备后，你可以使用 Midscene JavaScript SDK 来控制 iOS 设备。

import { PackageManagerTabs } from '@theme';

:::info 样例项目

使用 JavaScript SDK 控制 iOS 设备：[https://github.com/web-infra-dev/midscene-example/blob/main/ios/javascript-sdk-demo](https://github.com/web-infra-dev/midscene-example/blob/main/ios/javascript-sdk-demo)

与 Vitest 集成和测试：[https://github.com/web-infra-dev/midscene-example/tree/main/ios/vitest-demo](https://github.com/web-infra-dev/midscene-example/tree/main/ios/vitest-demo)

:::


:::info 案例展示

[查看更多案例](./ios-introduction)

<p align="center">
  <img src="/ios.png" alt="ios" width="400" />
</p>

:::

## 关于 WebDriver 和 Midscene 的关系

WebDriver 是一套由 W3C 制定的用于浏览器自动化的标准协议，它提供了一个统一的 API 来控制不同的浏览器和应用程序。WebDriver 协议定义了客户端和服务器之间的通信方式，使得自动化工具能够跨平台地控制各种用户界面。

在 Appium 团队及其他开源社区的努力下，业界已经有了许多优秀的库将桌面、移动端等设备的自动化操作转化为 WebDriver 协议。这些工具包括：
- **Appium** - 跨平台移动自动化框架
- **WebDriverAgent** - 专门用于 iOS 设备自动化的服务
- **Selenium** - Web 浏览器自动化工具
- **WinAppDriver** - Windows 应用程序自动化工具

**Midscene 适配了 WebDriver 协议**，这意味着开发者可以使用 AI 模型对支持 WebDriver 的任何设备进行智能化的自动化操作。通过这种设计，Midscene 不仅能够控制传统的点击、输入等基础操作，还能够：
- 理解界面内容和上下文
- 执行复杂的多步骤操作
- 进行智能断言和验证
- 提取和分析界面数据

在 iOS 平台上，Midscene 通过 WebDriverAgent 连接 iOS 设备，让你能够使用自然语言描述的方式来控制 iOS 应用和系统。

## 准备 WebDriver 服务

在开始之前，你需要先设置 iOS 开发环境：

- macOS（iOS 开发必需）
- Xcode 和 Xcode 命令行工具
- iOS 模拟器或真机设备

### 配置环境

在使用 Midscene iOS 之前，需要先准备 WebDriverAgent 服务。请参考官方文档进行设置：

- **模拟器配置**：[Run Prebuilt WDA](https://appium.github.io/appium-xcuitest-driver/5.12/run-prebuilt-wda/)
- **真机配置**：[Real Device Configuration](https://appium.github.io/appium-xcuitest-driver/5.12/real-device-config/)

### 验证环境配置

配置完成后，可以通过访问 WebDriverAgent 的状态接口来验证 服务是否启动：

**访问地址**：`http://localhost:8100/status`

**正确响应示例**：
```json
{
  "value": {
    "build": {
      "version": "10.1.1",
      "time": "Sep 24 2025 18:56:41",
      "productBundleIdentifier": "com.facebook.WebDriverAgentRunner"
    },
    "os": {
      "testmanagerdVersion": 65535,
      "name": "iOS",
      "sdkVersion": "26.0",
      "version": "26.0"
    },
    "device": "iphone",
    "ios": {
      "ip": "10.91.115.63"
    },
    "message": "WebDriverAgent is ready to accept commands",
    "state": "success",
    "ready": true
  },
  "sessionId": "BCAD9603-F714-447C-A9E6-07D58267966B"
}
```

如果能够正常访问该端点并返回类似上述的 JSON 响应，说明 WebDriverAgent 已经正确配置并运行。

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


## 集成 Midscene

### 第一步：安装依赖

<PackageManagerTabs command="install @midscene/ios --save-dev" />

### 第二步：编写脚本

这里以使用 iOS Safari 浏览器搜索耳机为例。

编写下方代码，保存为 `./demo.ts`

```typescript title="./demo.ts"
import {
  IOSAgent,
  IOSDevice,
  agentFromWebDriverAgent,
} from '@midscene/ios';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
Promise.resolve(
  (async () => {
    // 方法一：直接创建设备和 Agent
    const page = new IOSDevice({
      wdaPort: 8100,
      wdaHost: 'localhost',
    });

    // 👀 初始化 Midscene agent
    const agent = new IOSAgent(page, {
      aiActionContext:
        '如果出现位置、权限、用户协议等弹窗，点击同意。如果出现登录页面，关闭它。',
    });
    await page.connect();

    // 方法二：或者使用便捷函数（推荐）
    // const agent = await agentFromWebDriverAgent({
    //   wdaPort: 8100,
    //   wdaHost: 'localhost',
    //   aiActionContext: '如果出现位置、权限、用户协议等弹窗，点击同意。如果出现登录页面，关闭它。',
    // });

    // 👀 打开 ebay.com 网页
    await page.launch('https://ebay.com');
    await sleep(3000);

    // 👀 输入关键词，执行搜索
    await agent.aiAct('在搜索框输入 "Headphones"，敲回车');

    // 👀 等待加载完成
    await agent.aiWaitFor('页面中至少有一个耳机商品');
    // 或者你也可以使用一个普通的 sleep:
    // await sleep(5000);

    // 👀 理解页面内容，提取数据
    const items = await agent.aiQuery(
      '{itemTitle: string, price: Number}[], 找到列表里的商品标题和价格',
    );
    console.log('耳机商品信息', items);

    // 👀 用 AI 断言
    await agent.aiAssert('界面中有多个耳机产品');

    await page.destroy();
  })(),
);
```

### 第三步：运行

使用 `tsx` 来运行

```bash
# run
npx tsx demo.ts
```

稍等片刻，你会看到如下输出：

```log
[
 {
   itemTitle: 'AirPods Pro (2nd generation) with MagSafe Charging Case (USB-C)',
   price: 249
 },
 {
   itemTitle: 'Sony WH-1000XM4 Wireless Premium Noise Canceling Overhead Headphones',
   price: 278
 }
]
```

### 第四步：查看运行报告

当上面的命令执行成功后，会在控制台输出：`Midscene - report file updated: /path/to/report/some_id.html`，通过浏览器打开该文件即可看到报告。

## 构造函数与接口

<a id="iosdevice"></a>

### `IOSDevice` 的构造函数

IOSDevice 的构造函数支持以下参数：

- `opts?: IOSDeviceOpt` - 可选参数，用于初始化 IOSDevice 的配置
    - `wdaPort?: number` - 可选参数，WebDriverAgent 端口。默认值为 8100。
    - `wdaHost?: string` - 可选参数，WebDriverAgent 主机。默认值为 'localhost'。
    - `autoDismissKeyboard?: boolean` - 可选参数，是否在输入文本后自动关闭键盘。默认值为 true。
    - `customActions?: DeviceAction<any>[]` - 可选参数，自定义设备动作列表。

<a id="iosagent"></a>

### iOS Agent 上的更多接口

除了 [API 参考](./api.mdx) 中的通用 Agent 接口，IOSAgent 还提供了一些其他接口：

#### `agent.launch()`

启动一个网页或原生 iOS 应用。

- 类型

```typescript
function launch(uri: string): Promise<void>;
```

- 参数：

    - `uri: string` - 要打开的 uri，可以是网页 url、原生 app 的 bundle identifier 或自定义 URL scheme

- 返回值：

    - `Promise<void>`

- 示例：

```typescript
import { IOSAgent, IOSDevice, agentFromWebDriverAgent } from '@midscene/ios';

// 方法一：手动创建设备和 Agent
const page = new IOSDevice();
const agent = new IOSAgent(page);
await page.connect();

// 方法二：使用便捷函数（推荐）
const agent = await agentFromWebDriverAgent();

await agent.launch('https://www.apple.com'); // 打开网页
await agent.launch('com.apple.mobilesafari'); // 启动 Safari
await agent.launch('com.apple.Preferences'); // 启动设置应用
await agent.launch('myapp://profile/user/123'); // 打开应用深度链接
await agent.launch('tel:+1234567890'); // 拨打电话
await agent.launch('mailto:example@email.com'); // 发送邮件
```

#### `agent.runWdaRequest()`

直接调用 WebDriverAgent 的 API 接口。

> 注意：该方法允许你直接调用 WebDriverAgent 提供的底层 API，适用于需要执行特定 WDA 操作的场景。

- 类型

```typescript
function runWdaRequest(
  method: string,
  endpoint: string,
  data?: Record<string, any>,
): Promise<any>;
```

- 参数：

    - `method: string` - HTTP 请求方法（GET, POST, DELETE 等）
    - `endpoint: string` - WebDriver API 端点路径
    - `data?: Record<string, any>` - 可选的请求体数据（JSON 对象）

- 返回值：

    - `Promise<any>` - 返回 API 响应结果

- 示例：

```typescript
import { IOSAgent, IOSDevice, agentFromWebDriverAgent } from '@midscene/ios';

const agent = await agentFromWebDriverAgent();

// 获取屏幕信息
const screenInfo = await agent.runWdaRequest('GET', '/wda/screen');
console.log(screenInfo); // { value: { scale: 3, ... } }

// 按下 Home 键
const result = await agent.runWdaRequest('POST', '/session/test/wda/pressButton', {
  name: 'home'
});

// 获取设备信息
const deviceInfo = await agent.runWdaRequest('GET', '/wda/device/info');
```

:::info 在 YAML 脚本中使用

除了在 JavaScript/TypeScript 中使用这些方法，你还可以在 YAML 脚本中使用 iOS 的平台特定动作。

要了解如何在 YAML 脚本中使用 `runWdaRequest` 和 `launch` 动作，请参考 [YAML 脚本中的 iOS 平台特定动作](./automate-with-scripts-in-yaml#ios-部分)。

:::

#### `agent.home()`

返回到 iOS 主屏幕。

- 类型

```typescript
function home(): Promise<void>;
```

- 参数：无
- 返回值：`Promise<void>`

- 示例：

```typescript
import { IOSAgent, agentFromWebDriverAgent } from '@midscene/ios';

const agent = await agentFromWebDriverAgent();

await agent.home(); // 回到主屏幕
```

#### `agent.appSwitcher()`

打开 iOS 多任务切换界面。

- 类型

```typescript
function appSwitcher(): Promise<void>;
```

- 参数：无
- 返回值：`Promise<void>`

- 示例：

```typescript
import { IOSAgent, agentFromWebDriverAgent } from '@midscene/ios';

const agent = await agentFromWebDriverAgent();

await agent.appSwitcher(); // 打开多任务切换界面
```

### `agentFromWebDriverAgent()` (推荐)

通过连接 WebDriverAgent 服务创建 IOSAgent，这是最简便的方式。

- 类型

```typescript
function agentFromWebDriverAgent(
  opts?: PageAgentOpt & IOSDeviceOpt,
): Promise<IOSAgent>;
```

- 参数：

    - `opts?: PageAgentOpt & IOSDeviceOpt` - 可选参数，用于初始化 IOSAgent 的配置，其中 PageAgentOpt 参考 [构造器](./api.mdx)，IOSDeviceOpt 的配置值参考 [IOSDevice 的构造函数](./integrate-with-ios#iosdevice-%E7%9A%84%E6%9E%84%E9%80%A0%E5%87%BD%E6%95%B0)

- 返回值：

    - `Promise<IOSAgent>` 返回一个 IOSAgent 实例

- 示例：

```typescript
import { agentFromWebDriverAgent } from '@midscene/ios';

// 使用默认 WebDriverAgent 地址 (localhost:8100)
const agent = await agentFromWebDriverAgent();

// 使用自定义 WebDriverAgent 地址
const agent = await agentFromWebDriverAgent({
  wdaHost: 'localhost',
  wdaPort: 8100,
  aiActionContext: '如果出现弹窗，点击同意',
});
```



## 扩展自定义交互动作

使用 `customActions` 选项，结合 `defineAction` 定义的自定义交互动作，可以扩展 Agent 的动作空间。这些动作会追加在内置动作之后，方便 Agent 在规划阶段调用。

```typescript
import { getMidsceneLocationSchema, z } from '@midscene/core';
import { defineAction } from '@midscene/core/device';
import { IOSAgent, IOSDevice } from '@midscene/ios';

const ContinuousClick = defineAction({
  name: 'continuousClick',
  description: 'Click the same target repeatedly',
  paramSchema: z.object({
    locate: getMidsceneLocationSchema(),
    count: z
      .number()
      .int()
      .positive()
      .describe('How many times to click'),
  }),
  async call(param) {
    const { locate, count } = param;
    console.log('click target center', locate.center);
    console.log('click count', count);
    // 在这里结合 locate + count 实现自定义点击逻辑
  },
});

const agent = await agentFromWebDriverAgent({
  customActions: [ContinuousClick],
});

await agent.aiAct('点击红色按钮五次');
```

更多关于自定义动作的细节，请参考 [集成到任意界面](./integrate-with-any-interface)。

## 更多

- 更多 Agent 上的 API 接口请参考 [API 参考](./api.mdx)。

## FAQ

### 为什么我连接了设备，但是通过 WebDriverAgent 仍然无法控制？

请检查以下几点：

1. **开发者模式**：确保在设置 > 隐私与安全性 > 开发者模式 中已开启
2. **UI 自动化**：确保在设置 > 开发者 > UI 自动化，启用 UI 自动化
3. **设备信任**：确保设备已信任当前 Mac

### 模拟器和真机有什么区别？

| 特性 | 真机 | 模拟器 |
|------|------|---------|
| 端口转发 | 需要 iproxy | 不需要 |
| 开发者模式 | 需要启用 | 自动启用 |
| UI 自动化设置 | 需要手动启用 | 自动启用 |
| 性能 | 真实设备性能 | 依赖 Mac 性能 |
| 传感器 | 真实硬件 | 模拟数据 |

### 如何使用自定义的 WebDriverAgent 端口和主机？

你可以通过 IOSDevice 的构造函数或 agentFromWebDriverAgent 来指定 WebDriverAgent 的端口和主机：

```typescript
// 方法一：使用 IOSDevice
const device = new IOSDevice({
  wdaPort: 8100,        // 自定义端口
  wdaHost: '192.168.1.100', // 自定义主机
});

// 方法二：使用便捷函数（推荐）
const agent = await agentFromWebDriverAgent({
  wdaPort: 8100,        // 自定义端口
  wdaHost: '192.168.1.100', // 自定义主机
});
```

对于远程设备，还需要相应地设置端口转发：

```bash
iproxy 8100 8100 YOUR_DEVICE_ID
```

## 更多

- 更多 Agent 上的 API 接口请参考 [API 参考](./api.mdx)。



---
url: /zh/integrate-with-playwright.md
---



import { PackageManagerTabs } from '@theme';

# 集成到 Playwright

[Playwright.js](https://playwright.com/) 是由微软开发的一个开源自动化库，主要用于对网络应用程序进行端到端测试（end-to-end test）和网页抓取。

与 Playwright 的集成方式有以下两种方式：

- 直接用脚本方式集成和调用 Midscene Agent，适合快速体验、原型开发、数据抓取和自动化脚本等场景。
- 在 Playwright 的测试用例中集成 Midscene，适合需要执行 UI 测试的场景。

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


## 直接集成 Midscene Agent

:::info 样例项目

你可以在这里看到向 Playwright 集成的样例项目：[https://github.com/web-infra-dev/midscene-example/blob/main/playwright-demo](https://github.com/web-infra-dev/midscene-example/blob/main/playwright-demo)

:::

### 第一步：安装依赖

<PackageManagerTabs command="install @midscene/web playwright @playwright/test tsx --save-dev" />

### 第二步：编写脚本

编写下方代码，保存为 `./demo.ts`

```typescript
import { chromium } from 'playwright';
import { PlaywrightAgent } from '@midscene/web/playwright';
import 'dotenv/config'; // read environment variables from .env file

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

Promise.resolve(
  (async () => {
    const browser = await chromium.launch({
      headless: true, // 'true' means we can't see the browser window
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewportSize({
      width: 1280,
      height: 768,
    });
    await page.goto('https://www.ebay.com');
    await sleep(5000); // 👀 init Midscene agent
    const agent = new PlaywrightAgent(page);

    // 👀 type keywords, perform a search
    await agent.aiAct('type "Headphones" in search box, hit Enter');

    // 👀 wait for the loading
    await agent.aiWaitFor('there is at least one headphone item on page');
    // or you may use a plain sleep:
    // await sleep(5000);

    // 👀 understand the page content, find the items
    const items = await agent.aiQuery(
      '{itemTitle: string, price: Number}[], find item in list and corresponding price',
    );
    console.log('headphones in stock', items);

    const isMoreThan1000 = await agent.aiBoolean(
      'Is the price of the headphones more than 1000?',
    );
    console.log('isMoreThan1000', isMoreThan1000);

    const price = await agent.aiNumber(
      'What is the price of the first headphone?',
    );
    console.log('price', price);

    const name = await agent.aiString(
      'What is the name of the first headphone?',
    );
    console.log('name', name);

    const location = await agent.aiLocate(
      'What is the location of the first headphone?',
    );
    console.log('location', location);

    // 👀 assert by AI
    await agent.aiAssert('There is a category filter on the left');

    // 👀 click on the first item
    await agent.aiTap('the first item in the list');

    await browser.close();
  })(),
);
```

更多 Agent 的 API 讲解请参考 [API 参考](./api#interaction-methods)。

### 第三步：运行

使用 `tsx` 来运行，你会看到命令行打印出了耳机的商品信息：

```bash
# run
npx tsx demo.ts

# 命令行应该有如下输出
#  [
#   {
#     itemTitle: 'JBL Tour Pro 2 - True wireless Noise Cancelling earbuds with Smart Charging Case',
#     price: 551.21
#   },
#   {
#     itemTitle: 'Soundcore Space One无线耳机40H ANC播放时间2XStronger语音还原',
#     price: 543.94
#   }
# ]
```

### 第四步：查看运行报告

当上面的命令执行成功后，会在控制台输出：`Midscene - report file updated: /path/to/report/some_id.html`，通过浏览器打开该文件即可看到报告。

## 在 Playwright 的测试用例中集成 Midscene

这里我们假设你已经拥有一个集成了 Playwright 的测试项目。

:::info 样例项目

你可以在这里看到向 Playwright 集成的样例项目：[https://github.com/web-infra-dev/midscene-example/blob/main/playwright-testing-demo](https://github.com/web-infra-dev/midscene-example/blob/main/playwright-testing-demo)

:::

### 第一步：新增依赖，更新配置文件

新增依赖

<PackageManagerTabs command="install @midscene/web --save-dev" />

更新 playwright.config.ts

```diff
export default defineConfig({
  testDir: './e2e',
+ timeout: 90 * 1000,
+ reporter: [["list"], ["@midscene/web/playwright-reporter", { type: "merged" }]], // type 可选, 默认值为 "merged"，表示多个测试用例生成一个报告，可选值为 "separate"，表示为每个测试用例一个报告
});
```

其中 `reporter` 配置项的 `type` 可选值为 `merged` 或 `separate`，默认值为 `merged`，表示多个测试用例生成一个报告，可选值为 `separate`，表示为每个测试用例一个报告。

### 第二步：扩展 `test` 实例

把下方代码保存为 `./e2e/fixture.ts`;

```typescript
import { test as base } from '@playwright/test';
import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';
import { PlaywrightAiFixture } from '@midscene/web/playwright';

export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    waitForNetworkIdleTimeout: 2000, // 可选, 交互过程中等待网络空闲的超时时间, 默认值为 2000ms, 设置为 0 则禁用超时
  }),
);
```

### 第三步：编写测试用例

完整的交互、查询和辅助 API 请参考 [Agent API 参考](./api#interaction-methods)。如果需要调用更底层的能力，可以使用 `agentForPage` 获取 `PageAgent` 实例，再直接调用对应的方法：

```typescript
test('case demo', async ({ agentForPage, page }) => {
  const agent = await agentForPage(page);

  await agent.recordToReport();
  const logContent = agent._unstableLogContent();
  console.log(logContent);
});
```

#### 示例代码

```typescript title="./e2e/ebay-search.spec.ts"
import { expect } from '@playwright/test';
import { test } from './fixture';

test.beforeEach(async ({ page }) => {
  page.setViewportSize({ width: 400, height: 905 });
  await page.goto('https://www.ebay.com');
  await page.waitForLoadState('networkidle');
});

test('search headphone on ebay', async ({
  ai,
  aiQuery,
  aiAssert,
  aiInput,
  aiTap,
  aiScroll,
  aiWaitFor,
  aiRightClick,
  recordToReport,
}) => {
  // 使用 aiInput 输入搜索关键词
  await aiInput('Headphones', '搜索框');

  // 使用 aiTap 点击搜索按钮
  await aiTap('搜索按钮');

  // 等待搜索结果加载
  await aiWaitFor('搜索结果列表已加载', { timeoutMs: 5000 });

  // 使用 aiScroll 滚动到页面底部
  await aiScroll(
    {
      direction: 'down',
      scrollType: 'untilBottom',
    },
    '搜索结果列表',
  );

  // 使用 aiQuery 获取商品信息
  const items =
    await aiQuery<Array<{ title: string; price: number }>>(
      '获取搜索结果中的商品标题和价格',
    );

  console.log('headphones in stock', items);
  expect(items?.length).toBeGreaterThan(0);

  // 使用 aiAssert 验证筛选功能
  await aiAssert('界面左侧有类目筛选功能');

  // 使用 recordToReport 记录当前状态
  await recordToReport('搜索结果', { content: '耳机搜索的最终结果' });
});
```

更多 Agent 的 API 讲解请参考 [API 参考](./api#interaction-methods)。

### 第四步：运行测试用例

```bash
npx playwright test ./e2e/ebay-search.spec.ts
```

### 第五步：查看测试报告

当上面的命令执行成功后，会在控制台输出：`Midscene - report file updated: ./current_cwd/midscene_run/report/some_id.html`，通过浏览器打开该文件即可看到报告。

## Advanced

### 关于在新标签页打开

每个 Agent 实例都与对应的页面唯一绑定，为了方便开发者调试，Midscene 默认拦截了新 tab 的页面（如点击一个带有 `target="_blank"` 属性的链接），将其改为在当前页面打开。

如果你想恢复在新标签页打开的行为，你可以设置 `forceSameTabNavigation` 选项为 `false`，但相应的，你需要为新标签页创建一个 Agent 实例。

```typescript
const mid = new PlaywrightAgent(page, {
  forceSameTabNavigation: false,
});
```

### 连接远程 Playwright 浏览器并接入 Midscene Agent

:::info 示例项目

你可以在这里找到远程 Playwright 集成的示例项目：[https://github.com/web-infra-dev/midscene-example/tree/main/remote-playwright-demo](https://github.com/web-infra-dev/midscene-example/tree/main/remote-playwright-demo)

:::

当你已经在自有基础设施或供应商服务里运行浏览器时，可通过连接远程 Playwright 服务复用这些浏览器，让实例更贴近目标环境、避免重复启动，同时保持相同的 Midscene AI 自动化能力。

#### 前置依赖

<PackageManagerTabs command="install playwright @playwright/test @midscene/web --save-dev" />

#### 获取 CDP WebSocket URL

你可以从多种来源获取 CDP WebSocket URL：

- **BrowserBase**：在 https://browserbase.com 注册并获取你的 CDP URL
- **Browserless**：使用 https://browserless.io 或运行你自己的实例
- **本地 Chrome**：使用 `--remote-debugging-port=9222` 参数运行 Chrome，然后使用 `ws://localhost:9222/devtools/browser/...`
- **Docker**：在 Docker 容器中运行 Chrome 并暴露调试端口


#### 代码示例

```typescript
import { chromium } from 'playwright';
import { PlaywrightAgent } from '@midscene/web/playwright';

// 来自远程浏览器服务的 CDP WebSocket URL
const cdpWsUrl = 'ws://your-remote-browser.com/devtools/browser/your-session-id';

// 连接并选取页面
const browser = await chromium.connectOverCDP(cdpWsUrl);
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.newPage();

// 创建 Midscene Agent（用法与本地 Playwright agent 一致）
const agent = new PlaywrightAgent(page);

// 像平常一样调用 AI 方法
await agent.aiAction('跳转到 https://example.com');
await agent.aiAction('点击登录按钮');

// 清理
await agent.destroy();
await browser.close();
```

连接完成后，后续的 `PlaywrightAgent` 使用方式与本地启动的浏览器保持一致。

### 扩展自定义交互动作

使用 `customActions` 选项，结合 `defineAction` 定义的自定义交互动作，可以扩展 Agent 的动作空间。这些动作会追加在内置动作之后，方便 Agent 在规划阶段调用。

```typescript
import { getMidsceneLocationSchema, z } from '@midscene/core';
import { defineAction } from '@midscene/core/device';

const ContinuousClick = defineAction({
  name: 'continuousClick',
  description: 'Click the same target repeatedly',
  paramSchema: z.object({
    locate: getMidsceneLocationSchema(),
    count: z
      .number()
      .int()
      .positive()
      .describe('How many times to click'),
  }),
  async call(param) {
    const { locate, count } = param;
    console.log('click target center', locate.center);
    console.log('click count', count);
    // 在这里结合 locate + count 实现自定义点击逻辑
  },
});

const agent = new PlaywrightAgent(page, {
  customActions: [ContinuousClick],
});

await agent.aiAct('点击红色按钮五次');
```

更多关于自定义动作的细节，请参考 [集成到任意界面](./integrate-with-any-interface)。

## 更多

- 更多 Agent 的 API 文档请参考 [API 参考](./api#interaction-methods)。
- Playwright 的 API 文档请参考 [Playwright Agent API](http://localhost:3000/web-api-reference.html#playwright-agent)。
- 样例项目：[直接集成 Playwright](https://github.com/web-infra-dev/midscene-example/blob/main/playwright-demo)，[Playwright 测试集成](https://github.com/web-infra-dev/midscene-example/blob/main/playwright-testing-demo)，[远程 Playwright 集成](https://github.com/web-infra-dev/midscene-example/tree/main/remote-playwright-demo)



---
url: /zh/integrate-with-puppeteer.md
---




# 集成到 Puppeteer

import { PackageManagerTabs } from '@theme';

[Puppeteer](https://pptr.dev/) 是一个 Node.js 库，它通过 DevTools 协议或 WebDriver BiDi 提供控制 Chrome 或 Firefox 的高级 API。Puppeteer 默认在无界面模式（headless）下运行，但可以配置为在可见的浏览器模式（headed）中运行。

:::info 样例项目

你可以在这里看到向 Puppeteer 集成的样例项目：[https://github.com/web-infra-dev/midscene-example/blob/main/puppeteer-demo](https://github.com/web-infra-dev/midscene-example/blob/main/puppeteer-demo)

这里还有一个 Puppeteer 和 Vitest 结合的样例项目：[https://github.com/web-infra-dev/midscene-example/tree/main/puppeteer-with-vitest-demo](https://github.com/web-infra-dev/midscene-example/tree/main/puppeteer-with-vitest-demo)

:::

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


## 集成 Midscene Agent

### 第一步：安装依赖

<PackageManagerTabs command="install @midscene/web puppeteer tsx --save-dev" />

### 第二步：编写脚本

编写下方代码，保存为 `./demo.ts`

```typescript title="./demo.ts"
import puppeteer from "puppeteer";
import { PuppeteerAgent } from "@midscene/web/puppeteer";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
Promise.resolve(
  (async () => {
    const browser = await puppeteer.launch({
      headless: false, // here we use headed mode to help debug
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
    });

    await page.goto("https://www.ebay.com");
    await sleep(5000);

    // 👀 初始化 Midscene agent 
    const agent = new PuppeteerAgent(page);

    // 👀 执行搜索
    // 注：尽管这是一个英文页面，你也可以用中文指令控制它
    await agent.aiAct('在搜索框输入 "Headphones"，敲回车');
    await sleep(5000);

    // 👀 理解页面，提取数据
    const items = await agent.aiQuery(
      '{itemTitle: string, price: Number}[], 找到列表里的商品标题和价格',
    );
    console.log("耳机商品信息", items);

    // 👀 用 AI 断言
    await agent.aiAssert("界面左侧有类目筛选功能");

    await browser.close();
  })()
);
```

### 第三步：运行

使用 `tsx` 来运行，你会看到命令行打印出了耳机的商品信息：

```bash
# run
npx tsx demo.ts

# 命令行应该有如下输出
#  [
#   {
#     itemTitle: 'Beats by Dr. Dre Studio Buds Totally Wireless Noise Cancelling In Ear + OPEN BOX',
#     price: 505.15
#   },
#   {
#     itemTitle: 'Skullcandy Indy Truly Wireless Earbuds-Headphones Green Mint',
#     price: 186.69
#   }
# ]
```

更多 Agent 的 API 讲解请参考 [API 参考](./api#interaction-methods)。

### 第四步：查看运行报告

当上面的命令执行成功后，会在控制台输出：`Midscene - report file updated: /path/to/report/some_id.html`，通过浏览器打开该文件即可看到报告。

<a id="puppeteeragent"></a>

## Advanced

### 关于在新标签页打开

每个 Agent 实例都与对应的页面唯一绑定，为了方便开发者调试，Midscene 默认拦截了新 tab 的页面（如点击一个带有 `target="_blank"` 属性的链接），将其改为在当前页面打开。

如果你想恢复在新标签页打开的行为，你可以设置 `forceSameTabNavigation` 选项为 `false`，但相应的，你需要为新标签页创建一个 Agent 实例。

```typescript
const mid = new PuppeteerAgent(page, {
  forceSameTabNavigation: false,
});
```

### 连接远程 Puppeteer 浏览器并接入 Midscene Agent

:::info 示例项目

你可以在这里找到远程 Puppeteer 集成的示例项目：[https://github.com/web-infra-dev/midscene-example/tree/main/remote-puppeteer-demo](https://github.com/web-infra-dev/midscene-example/tree/main/remote-puppeteer-demo)

:::

当你想复用已有的远程浏览器（例如云端常驻的 worker、第三方浏览器网格或本地内网桌面）时，可以通过此流程把 Midscene 接到远程 Puppeteer 实例上。这样做能让浏览器靠近目标环境、降低重复启动成本，并统一管理浏览器资源，同时保持一致的 AI 自动化能力。

实践中你需要手动：
1. 从远程浏览器服务获取 CDP WebSocket URL
2. 使用 Puppeteer 连接到远程浏览器
3. 创建 Midscene Agent 进行 AI 驱动的自动化

#### 前置依赖

<PackageManagerTabs command="install puppeteer @midscene/web --save-dev" />

#### 获取 CDP WebSocket URL

你可以从多种来源获取 CDP WebSocket URL：

- **BrowserBase**：在 https://browserbase.com 注册并获取你的 CDP URL
- **Browserless**：使用 https://browserless.io 或运行你自己的实例
- **本地 Chrome**：使用 `--remote-debugging-port=9222` 参数运行 Chrome，然后使用 `ws://localhost:9222/devtools/browser/...`
- **Docker**：在 Docker 容器中运行 Chrome 并暴露调试端口


#### 基础示例

```typescript
import puppeteer from 'puppeteer';
import { PuppeteerAgent } from '@midscene/web/puppeteer';

// 假设你已经有了一个 CDP WebSocket URL
const cdpWsUrl = 'ws://your-remote-browser.com/devtools/browser/your-session-id';

// 连接到远程浏览器
const browser = await puppeteer.connect({
  browserWSEndpoint: cdpWsUrl
});

// 获取或创建页面
const pages = await browser.pages();
const page = pages[0] || await browser.newPage();

// 创建 Midscene Agent
const agent = new PuppeteerAgent(page);

// 使用 AI 方法
await agent.aiAction('跳转到 https://example.com');
await agent.aiAction('点击登录按钮');
const result = await agent.aiQuery('获取页面标题: {title: string}');

// 清理
await agent.destroy();
await browser.disconnect();
```

### 提供自定义动作

可以使用 `customActions` 选项，通过 `defineAction` 来扩展 Agent 的动作空间。传入该选项后，这些动作会追加到内置动作中，Agent 在规划（Planning）时就可以调用它们。

```typescript
import { getMidsceneLocationSchema, z } from '@midscene/core';
import { defineAction } from '@midscene/core/device';

const ContinuousClick = defineAction({
  name: 'continuousClick',
  description: 'Click the same target repeatedly',
  paramSchema: z.object({
    locate: getMidsceneLocationSchema(),
    count: z
      .number()
      .int()
      .positive()
      .describe('How many times to click'),
  }),
  async call(param) {
    const { locate, count } = param;
    console.log('click target center', locate.center);
    console.log('click count', count);
    // 在这里结合 locate + count 实现自定义点击逻辑
  },
});

const agent = new PuppeteerAgent(page, {
  customActions: [ContinuousClick],
});

await agent.aiAct('点击红色按钮五次');
```

更多关于自定义动作的细节，请参考 [集成到任意界面](./integrate-with-any-interface)。

## 更多

- 更多 Agent 的 API 文档请参考 [API 参考](./api#interaction-methods)。
- Puppeteer 的 API 文档请参考 [Puppeteer Agent API](http://localhost:3000/web-api-reference.html#puppeteer-agent)。
- 样例项目
    - Puppeteer：[https://github.com/web-infra-dev/midscene-example/blob/main/puppeteer-demo](https://github.com/web-infra-dev/midscene-example/blob/main/puppeteer-demo)
    - Puppeteer + Vitest：[https://github.com/web-infra-dev/midscene-example/tree/main/puppeteer-with-vitest-demo](https://github.com/web-infra-dev/midscene-example/tree/main/puppeteer-with-vitest-demo)



---
url: /zh/introduction.md
---

# Midscene.js - AI 驱动，带来愉悦的 UI 自动化体验

视觉模型驱动，支持全平台的 UI 自动化 SDK

## 📣 v1.0 正式发布公告

> **我们已发布 v1.0 版本。** 目前已在 npm 发布。  
> 最新文档与代码请查看 [https://midscenejs.com/](https://midscenejs.com/) 以及 `main` 分支。  
> 历史文档请访问 [https://v0.midscenejs.com/](https://v0.midscenejs.com/)。  
> v1.0 变更记录: [https://midscenejs.com/changelog](https://midscenejs.com/changelog)

## 功能特性

### 用自然语言编写自动化脚本
- 描述你的目标和步骤，Midscene 会为你规划和操作用户界面。
- 使用 JavaScript SDK 或 YAML 格式编写自动化脚本。

### Web & Mobile App & 任意界面
- **网页自动化**：可以[与 Puppeteer 集成](./integrate-with-puppeteer)，[与 Playwright 集成](./integrate-with-playwright)或使用[桥接模式](./bridge-mode)来控制桌面浏览器。
- **Android 自动化**：使用 [JavaScript SDK](./android-getting-started) 配合 adb 来控制本地 Android 设备。
- **iOS 自动化**：使用 [JavaScript SDK](./ios-getting-started) 配合 WebDriverAgent 来控制本地 iOS 设备与模拟器。
- **任意界面自动化**：使用 [JavaScript SDK](./integrate-with-any-interface) 来控制你自己的界面。

### 面向开发者
- **三种类型的 API**:
    - [**交互 API**](./api#interaction-methods): 与用户界面交互。
    - [**数据提取 API**](./api#data-extraction): 从用户界面和 DOM 中提取数据。
    - [**实用 API**](./api#more-apis): 实用函数，如 `aiAssert()` （断言）, `aiLocate()` （定位）, `aiWaitFor()` （等待）。
- **MCP**: Midscene 提供 MCP 服务，将 Midscene Agent 的原子操作暴露为 MCP 工具，上层 Agent 可以用自然语言检查和操作界面。[文档](./mcp)
- [**使用缓存，提高执行效率**](./caching): 使用缓存能力重放脚本，提高执行效率。
- **调试体验**: Midscene.js 提供可视化回放报告、内置 Playground 和 Chrome 插件，帮助开发者更高效地定位与排障。

## 演示案例

我们准备了一些演示案例供你学习 Midscene.js 的使用。

1. 使用 JS 代码驱动任务编排，收集周杰伦演唱会信息，并写入 Google Docs（使用 UI-TARS 模型）

<video src="https://github.com/user-attachments/assets/75474138-f51f-4c54-b3cf-46d61d059999" height="300" controls />

2. 控制 Android 上的地图应用（使用 Qwen-2.5-VL 模型）

<video src="https://github.com/user-attachments/assets/1f5bab0e-4c28-44e1-b378-a38809b05a00" height="300" controls />

3. 使用 midscene mcp 浏览页面 ( https://www.saucedemo.com/ )，执行登录、添加产品、下订单，最后基于 mcp 执行步骤和 playwright 示例生成测试用例

<video src="https://github.com/user-attachments/assets/a95ca353-e50c-4091-85ba-e542f576b6be" height="300" controls />

## 零代码快速体验

- **[Chrome 插件](./quick-experience)**：通过 [Chrome 插件](./quick-experience) 立即开始浏览器内体验，无需编写任何代码。
- **[Android Playground](./android-getting-started#试用-playground-零代码)**：使用 Android playground 来控制你的本地 Android 设备。
- **[iOS Playground](./ios-getting-started#试用-playground)**：使用 iOS playground 来控制你的本地 iOS 设备。

## ✨ 视觉语言模型驱动

Midscene.js 在 UI 操作上采用纯视觉（pure-vision）路线：元素定位和交互只基于截图完成。支持视觉语言模型，例如 `Qwen3-VL`、`Doubao-1.6-vision`、`gemini-3-pro`、`gemini-3-flash` 和 `UI-TARS`。在数据提取和页面理解场景中，需要时仍可选择附带 DOM 信息。

* UI 操作采用纯视觉定位，不再提供 DOM 提取兼容模式。
* 适用于 Web、移动端、桌面应用，甚至 `<canvas>` 场景。
* UI 操作无需 DOM，Token 更少、成本更低、运行更快。
* 数据提取和页面理解可按需附带 DOM 信息。
* 支持开源模型，方便自托管。

更多信息请阅读 [模型策略](./model-strategy)。

## 两种自动化风格

### 自动规划

AI 自主规划执行流程，完成任务

```javascript
await aiAct('逐一点击所有记录。如果某个记录包含文本"completed"，则跳过它');
```

### 工作流风格

将复杂逻辑拆分为多个步骤，以提高自动化代码的稳定性。

```javascript
const recordList = await agent.aiQuery('string[], the record list')
for (const record of recordList) {
  const hasCompleted = await agent.aiBoolean(`check if the record ${record}" contains the text "completed"`)
  if (!hasCompleted) {
    await agent.aiTap(record)
  }
}
```

> 有关工作流风格的更多详细信息，请参阅 [使用 JavaScript 优化 AI 自动化代码](./use-javascript-to-optimize-ai-automation-code)

## 资源

* 主页和文档：[https://midscenejs.com](https://midscenejs.com/)
* 示例项目：[https://github.com/web-infra-dev/midscene-example](https://github.com/web-infra-dev/midscene-example)
* API 参考：[https://midscenejs.com/api.html](./api)
* GitHub：[https://github.com/web-infra-dev/midscene](https://github.com/web-infra-dev/midscene)

## 社区

* [Web Infra 团队微信公众号](https://lf3-static.bytednsdoc.com/obj/eden-cn/vhaeh7vhabf/web-infra-wechat.jpg)
* [Discord](https://discord.gg/2JyBHxszE4)
* [在 X 上关注我们](https://x.com/midscene_ai)
* [飞书交流群](https://applink.larkoffice.com/client/chat/chatter/add_by_link?link_token=291q2b25-e913-411a-8c51-191e59aab14d)

## 致谢

我们要感谢以下项目：

- [Rsbuild](https://github.com/web-infra-dev/rsbuild) 和 [Rslib](https://github.com/web-infra-dev/rslib) 提供构建工具。
- [UI-TARS](https://github.com/bytedance/ui-tars) 提供开源智能体模型 UI-TARS。
- [Qwen2.5-VL](https://github.com/QwenLM/Qwen2.5-VL) 提供开源 VL 模型 Qwen2.5-VL。
- [scrcpy](https://github.com/Genymobile/scrcpy) 和 [yume-chan](https://github.com/yume-chan) 让我们能够用浏览器控制 Android 设备。
- [appium-adb](https://github.com/appium/appium-adb) 提供 adb 的 JavaScript 桥接。
- [appium-webdriveragent](https://github.com/appium/WebDriverAgent) 用于 JavaScript 操作 XCTest。
- [YADB](https://github.com/ysbing/YADB) 提供 yadb 工具，提升文本输入性能。
- [Puppeteer](https://github.com/puppeteer/puppeteer) 提供浏览器自动化和控制。
- [Playwright](https://github.com/microsoft/playwright) 提供浏览器自动化、控制和测试。

## License

Midscene.js 使用 [MIT 许可协议](https://github.com/web-infra-dev/midscene/blob/main/LICENSE)。



---
url: /zh/ios-api-reference.md
---

# API 参考（iOS）

当你需要自定义 iOS 设备行为、将 Midscene 接入依赖 WebDriverAgent 的工作流，或排查 WDA 请求问题时，请查阅本节。关于通用构造函数（报告、Hook、缓存等），请参考平台无关的 [API 参考](./api)。

## Action Space（动作空间）

`IOSDevice` 使用以下动作空间，Midscene Agent 在规划任务时可以使用这些操作：

- `Tap` —— 点击元素。
- `DoubleClick` —— 双击元素。
- `Input` —— 输入文本，支持 `replace`/`append`/`clear` 模式，可选 `autoDismissKeyboard`。
- `Scroll` —— 以元素为起点或从屏幕中央向上/下/左/右滚动，支持滚动到顶/底/左/右。
- `DragAndDrop` —— 从一个元素拖拽到另一个元素。
- `KeyboardPress` —— 按下指定键位。
- `IOSLongPress` —— 长按目标元素，可选自定义时长。
- `ClearInput` —— 清空输入框内容。
- `Launch` —— 打开网页、Bundle ID 或 URL Scheme。
- `RunWdaRequest` —— 直接调用 WebDriverAgent REST 接口。
- `IOSHomeButton` —— 执行 iOS 系统 Home 操作。
- `IOSAppSwitcher` —— 打开 iOS 多任务视图。

## IOSDevice {#iosdevice}

创建一个由 WebDriverAgent 支撑、供 IOSAgent 驱动的设备连接。

### 导入

```ts
import { IOSDevice } from '@midscene/ios';
```

### 构造函数

```ts
const device = new IOSDevice({
  // 设备参数...
});
```

### 设备选项

- `wdaPort?: number` —— WebDriverAgent 端口，默认 `8100`。
- `wdaHost?: string` —— WebDriverAgent host，默认 `'localhost'`。
- `autoDismissKeyboard?: boolean` —— 文本输入后自动隐藏键盘，默认 `true`。
- `customActions?: DeviceAction<any>[]` —— 向 Agent 暴露的额外设备动作。


### 使用说明

- 请确认已开启开发者模式且 WDA 能访问设备；真机转发端口时可借助 `iproxy`。
- 通过 `wdaHost`/`wdaPort` 可指向远程设备或自建的 WDA。
- 通用交互方法请查阅 [API 参考（通用）](./api#interaction-methods)。

### 示例

#### 快速开始

```ts
import { IOSAgent, IOSDevice } from '@midscene/ios';

const device = new IOSDevice({ wdaHost: 'localhost', wdaPort: 8100 });
await device.connect();

const agent = new IOSAgent(device, {
  aiActionContext: 'If any permission dialog appears, accept it.',
});

await agent.launch('https://ebay.com');
await agent.aiAct('Search for \"Headphones\"');
const items = await agent.aiQuery(
  '{itemTitle: string, price: Number}[], list headphone products',
);
console.log(items);
```

#### 自定义 Host 与端口

```ts
const device = new IOSDevice({
  wdaHost: '192.168.1.100',
  wdaPort: 8300,
});
await device.connect();
```

## IOSAgent {#iosagent}

将 Midscene 的 AI 规划能力绑定到 IOSDevice，通过 WebDriverAgent 实现 UI 自动化。

### 导入

```ts
import { IOSAgent } from '@midscene/ios';
```

### 构造函数

```ts
const agent = new IOSAgent(device, {
  // 通用 Agent 参数...
});
```

### iOS 特有选项

- `customActions?: DeviceAction<any>[]` —— 通过 `defineAction` 扩展规划器的可用动作。
- 其余字段与 [API constructors](./api#common-parameters) 一致：`generateReport`、`reportFileName`、`aiActionContext`、`modelConfig`、`cacheId`、`createOpenAIClient`、`onTaskStartTip` 等。

### 使用说明

:::info

- 一个设备连接对应一个 Agent。
- `launch`、`runWdaRequest` 等 iOS 专属辅助函数也可在 YAML 脚本中使用，语法见 [iOS 平台特定动作](./automate-with-scripts-in-yaml#the-ios-part)。
- 通用交互方法请查阅 [API 参考（通用）](./api#interaction-methods)。

:::

### iOS 特有方法

#### `agent.launch()`

打开网页、原生应用或自定义 Scheme。

```ts
function launch(uri: string): Promise<void>;
```

- `uri: string` —— 目标地址（网页 URL、Bundle Identifier、URL scheme、tel/mailto 等）。

```ts
await agent.launch('https://www.apple.com');
await agent.launch('com.apple.Preferences');
await agent.launch('myapp://profile/user/123');
await agent.launch('tel:+1234567890');
```

#### `agent.runWdaRequest()`

当你需要更底层的控制能力时，执行原始的 WebDriverAgent REST 请求。

```ts
function runWdaRequest(
  method: string,
  endpoint: string,
  data?: Record<string, any>,
): Promise<any>;
```

- `method: string` —— HTTP 动词（`GET`、`POST`、`DELETE` 等）。
- `endpoint: string` —— WebDriverAgent 接口路径。
- `data?: Record<string, any>` —— 可选的 JSON 请求体。

```ts
const screen = await agent.runWdaRequest('GET', '/wda/screen');
await agent.runWdaRequest('POST', '/session/test/wda/pressButton', { name: 'home' });
```

#### 应用间导航

- `agent.home(): Promise<void>` —— 回到主屏。
- `agent.appSwitcher(): Promise<void>` —— 打开多任务视图。

### 辅助工具

#### `agentFromWebDriverAgent()` {#agentfromwebdriveragent}

连接 WebDriverAgent 并返回可用的 IOSAgent。

```ts
function agentFromWebDriverAgent(
  opts?: PageAgentOpt & IOSDeviceOpt,
): Promise<IOSAgent>;
```

- `opts?: PageAgentOpt & IOSDeviceOpt` —— 在一个对象中同时传入通用 Agent 选项与 [`IOSDevice`](#iosdevice) 的配置。

```ts
import { agentFromWebDriverAgent } from '@midscene/ios';

const agent = await agentFromWebDriverAgent({
  wdaHost: 'localhost',
  wdaPort: 8100,
  aiActionContext: 'Accept permission dialogs automatically.',
});
```

### 扩展自定义交互动作

通过 `defineAction` 创建处理器并传入 `customActions`，即可扩展 Agent 的动作空间。这些动作会追加在内置动作之后，可在规划阶段被调用。

```ts
import { getMidsceneLocationSchema, z } from '@midscene/core';
import { defineAction } from '@midscene/core/device';
import { agentFromWebDriverAgent } from '@midscene/ios';

const ContinuousClick = defineAction({
  name: 'continuousClick',
  description: 'Click the same target repeatedly',
  paramSchema: z.object({
    locate: getMidsceneLocationSchema(),
    count: z
      .number()
      .int()
      .positive()
      .describe('How many times to click'),
  }),
  async call({ locate, count }) {
    console.log('click target center', locate.center);
    console.log('click count', count);
  },
});

const agent = await agentFromWebDriverAgent({
  customActions: [ContinuousClick],
});

await agent.aiAct('Click the red button five times');
```

### 相关阅读

- [iOS 快速开始](./ios-getting-started) 获取搭建与脚本示例。
- [与任意界面集成](./integrate-with-any-interface) 查看自定义动作与 Schema 细节。



---
url: /zh/ios-getting-started.md
---





import { PackageManagerTabs } from '@theme';

# iOS 开始使用

本指南会带你完成使用 Midscene 控制 iOS 设备的全部步骤：通过 WebDriverAgent 连接真机、配置模型 API Key、体验零代码 Playground，并运行你的首个 JavaScript 脚本。

:::info 示例项目

使用 JavaScript 控制 iOS 设备：[https://github.com/web-infra-dev/midscene-example/blob/main/ios/javascript-sdk-demo](https://github.com/web-infra-dev/midscene-example/blob/main/ios/javascript-sdk-demo)

集成 Vitest 进行测试：[https://github.com/web-infra-dev/midscene-example/tree/main/ios/vitest-demo](https://github.com/web-infra-dev/midscene-example/tree/main/ios/vitest-demo)

:::

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


## 准备工作

继续之前，请确保 WebDriverAgent 可以与设备通信。

## 准备工作

### 安装 Node.js

安装 [Node.js 18 或以上版本](https://nodejs.org/en/download/)。

### 准备 API Key

准备一个视觉语言（VL）模型的 API Key。

你可以在 [模型策略](../model-strategy) 文档中查看 Midscene.js 支持的模型和配置。

### 准备 WebDriver 服务

在开始之前，你需要先设置 iOS 开发环境：

- macOS（iOS 开发必需）
- Xcode 和 Xcode 命令行工具
- iOS 模拟器或真机设备

#### 配置环境

在使用 Midscene iOS 之前，需要先准备 WebDriverAgent 服务。

:::note 版本要求

WebDriverAgent 版本需要 **>= 7.0.0**

:::

请参考官方文档进行设置：

- **模拟器配置**：[Run Prebuilt WDA](https://appium.github.io/appium-xcuitest-driver/5.12/run-prebuilt-wda/)
- **真机配置**：[Real Device Configuration](https://appium.github.io/appium-xcuitest-driver/5.12/real-device-config/)

#### 验证环境配置

配置完成后，可以通过访问 WebDriverAgent 的状态接口来验证 服务是否启动：

**访问地址**：`http://localhost:8100/status`

**正确响应示例**：
```json
{
  "value": {
    "build": {
      "version": "10.1.1",
      "time": "Sep 24 2025 18:56:41",
      "productBundleIdentifier": "com.facebook.WebDriverAgentRunner"
    },
    "os": {
      "testmanagerdVersion": 65535,
      "name": "iOS",
      "sdkVersion": "26.0",
      "version": "26.0"
    },
    "device": "iphone",
    "ios": {
      "ip": "10.91.115.63"
    },
    "message": "WebDriverAgent is ready to accept commands",
    "state": "success",
    "ready": true
  },
  "sessionId": "BCAD9603-F714-447C-A9E6-07D58267966B"
}
```

如果能够正常访问该端点并返回类似上述的 JSON 响应，说明 WebDriverAgent 已经正确配置并运行。


## 试用 Playground

Playground 是验证连接、观察 AI 驱动步骤的最快方式，无需编写代码。它与 `@midscene/ios` 共享相同的核心，因此在 Playground 中通过的流程，在脚本中运行会保持一致。

![](/ios-playground.png)

1. 启动 Playground CLI：

```bash
npx --yes @midscene/ios-playground
```

2. 点击窗口中的齿轮按钮进入配置页，粘贴你的 API Key 配置。如果还没有 API Key，请回到 [模型配置](./model-config) 获取。

![](/ios-set-env.png)

### 开始体验

配置完成后，你可以立即开始体验 Midscene。它提供了多个关键操作 Tab：

- **Act**: 与网页进行交互，这就是自动规划（Auto Planning），对应于 `aiAct` 方法。比如
```
在搜索框中输入 Midscene，执行搜索，跳转到第一条结果
```

```
填写完整的注册表单，注意主要让所有字段通过校验
```

- **Query**: 从界面中提取 JSON 结构的数据，对应于 `aiQuery` 方法。

类似的方法还有 `aiBoolean()`, `aiNumber()`, `aiString()`，用于直接提取布尔值、数字和字符串。

```
提取页面中的用户 ID，返回 { id: string } 结构的 JSON 数据
```


- **Assert**: 理解页面，进行断言，如果不满足则抛出错误，对应于 `aiAssert` 方法。

```
页面上存在一个登录按钮，它的下方有一个用户协议的链接
```

- **Tap**: 在某个元素上点击，这就是即时操作（Instant Action），对应于 `aiTap` 方法。
```
点击登录按钮
```

> 关于自动规划（Auto Planning）和即时操作（Instant Action）的区别，请参考 [API](../api.mdx) 文档。


## 集成 Midscene Agent

当 Playground 工作正常后，就可以切换到可复用的 JavaScript 脚本。

### 第 1 步：安装依赖

<PackageManagerTabs command="install @midscene/ios --save-dev" />

### 第 2 步：编写脚本

下面的示例会在设备上打开 Safari，搜索 eBay，并断言结果列表。

```typescript title="./demo.ts"
import {
  IOSAgent,
  IOSDevice,
  agentFromWebDriverAgent,
} from '@midscene/ios';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
Promise.resolve(
  (async () => {
    // 方式一：直接创建设备和 Agent
    const page = new IOSDevice({
      wdaPort: 8100,
      wdaHost: 'localhost',
    });

    // 👀 初始化 Midscene Agent
    const agent = new IOSAgent(page, {
      aiActionContext:
        'If any location, permission, user agreement, etc. popup appears, click agree. If login page appears, close it.',
    });
    await page.connect();

    // 方式二：使用便捷函数（推荐）
    // const agent = await agentFromWebDriverAgent({
    //   wdaPort: 8100,
    //   wdaHost: 'localhost',
    //   aiActionContext: 'If any location, permission, user agreement, etc. popup appears, click agree. If login page appears, close it.',
    // });

    // 👀 直接打开 ebay.com（推荐做法）
    await page.launch('https://ebay.com');
    await sleep(3000);

    // 👀 输入关键字并执行搜索
    await agent.aiAct('Search for "Headphones"');

    // 👀 等待加载完成
    await agent.aiWaitFor('At least one headphone product is displayed on the page');
    // 或简单地等待几秒：
    // await sleep(5000);

    // 👀 理解页面内容并提取数据
    const items = await agent.aiQuery(
      '{itemTitle: string, price: Number}[], find product titles and prices in the list',
    );
    console.log('Headphone product information', items);

    // 👀 使用 AI 断言
    await agent.aiAssert('Multiple headphone products are displayed on the interface');

    await page.destroy();
  })(),
);
```

### 第 3 步：运行示例

```bash
npx tsx demo.ts
```

### 第 4 步：查看报告

脚本成功后会输出 `Midscene - report file updated: /path/to/report/some_id.html`。在浏览器中打开对应 HTML 文件即可回放每一步交互、查询与断言。

## API 参考与更多资源

需要查看构造函数、辅助方法或平台专属设备 API？请移步 [iOS API 参考](./ios-api-reference) 获取详细参数及自定义操作等高级主题。若想了解跨平台共用的 API，可阅读 [通用 API 参考](./api)。

## 常见问题

### 为什么 WebDriverAgent 已连接，但仍无法控制设备？

请检查以下事项：

1. **开发者模式**：在“设置 > 隐私与安全性 > 开发者模式”中确认已开启。
2. **UI Automation**：在“设置 > 开发者 > UI Automation”中确认已开启。
3. **设备信任**：确保设备信任当前 Mac。

### 模拟器与真机有哪些区别？

| 特性 | 真机 | 模拟器 |
|------|------|--------|
| 端口转发 | 需要 iproxy | 不需要 |
| 开发者模式 | 必须手动开启 | 默认开启 |
| UI Automation 设置 | 需手动开启 | 默认开启 |
| 性能 | 真实设备性能 | 取决于 Mac 性能 |
| 传感器 | 真实硬件 | 模拟数据 |

### 如何自定义 WebDriverAgent 的端口和 Host？

可以通过 `IOSDevice` 构造函数或 `agentFromWebDriverAgent` 来指定端口和 Host：

```typescript
// 方式一：使用 IOSDevice
const device = new IOSDevice({
  wdaPort: 8100,        // 自定义端口
  wdaHost: '192.168.1.100', // 自定义主机
});

// 方式二：使用便捷函数（推荐）
const agent = await agentFromWebDriverAgent({
  wdaPort: 8100,        // 自定义端口
  wdaHost: '192.168.1.100', // 自定义主机
});
```

针对远程设备，还需要按需设置端口转发：

```bash
iproxy 8100 8100 YOUR_DEVICE_ID
```

## 更多

- 查看所有 Agent 方法：[API 参考（通用）](./api#interaction-methods)
- iOS 专属参数与接口：[iOS Agent API](./ios-api-reference)
- 示例项目
    - iOS JavaScript SDK 示例：[https://github.com/web-infra-dev/midscene-example/blob/main/ios/javascript-sdk-demo](https://github.com/web-infra-dev/midscene-example/blob/main/ios/javascript-sdk-demo)
    - iOS + Vitest 示例：[https://github.com/web-infra-dev/midscene-example/tree/main/ios/vitest-demo](https://github.com/web-infra-dev/midscene-example/tree/main/ios/vitest-demo)



---
url: /zh/ios-introduction.md
---

# iOS 自动化支持

Midscene 可以驱动 WebDriver 工具来支持 iOS 自动化。

由于适配了视觉模型方案，整个自动化过程可以适配任意的 App 技术栈，无论是 Native、Flutter 还是 React Native 构建的 App 或小程序都能使用。开发者只需面向最终效果调试 UI 自动化脚本即可。

iOS UI 自动化方案具备 Midscene 的全部特性：

- 支持使用 Playground 进行零代码试用。
- 支持 JavaScript SDK。
- 支持使用 YAML 格式的自动化脚本与命令行工具。
- 支持生成 HTML 报告回放所有操作路径。

## 案例展示

### Twitter 自动点赞

打开 Twitter，自动点赞 [@midscene_ai](https://x.com/midscene_ai) 的第一条推文。

<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/ios-twitter.mp4" controls/>

## 在 Playground 中试用

借助 Playground，你无需编写任何代码即可体验 Midscene 的能力。

点击查看 [iOS Playground 使用文档](/zh/ios-getting-started#试用-playground)。

## 关于 WebDriverAgent

WebDriver 是 W3C 制定的浏览器自动化标准协议，提供统一的 API 来控制不同的浏览器和应用。该协议定义了客户端与服务端之间的通信方式，使自动化工具能跨平台地操纵各种界面。

得益于 Appium 团队以及其他开源社区的努力，业界已经出现了多个优秀的库，将桌面端和移动端的操作转化为 WebDriver 协议，例如：

- **Appium** —— 跨平台移动自动化框架
- **WebDriverAgent** —— 专注于 iOS 设备自动化的服务
- **Selenium** —— Web 浏览器自动化工具
- **WinAppDriver** —— Windows 应用自动化工具

**Midscene 适配 WebDriver 协议**，这意味着开发者可以在任何支持 WebDriver 的设备上使用 AI 模型执行智能自动化操作。通过该设计，Midscene 不仅能完成点击、输入等传统操作，还可以：

- 理解界面内容与上下文
- 执行复杂的多步骤操作
- 进行智能断言与验证
- 提取并分析界面数据

在 iOS 平台上，Midscene 通过 WebDriverAgent 连接 iOS 设备，让你可以用自然语言描述来控制 iOS App 和系统。


## 下一步

* [使用 JavaScript SDK](./ios-getting-started)
* [使用 YAML 格式的自动化脚本](./automate-with-scripts-in-yaml) 与 [命令行工具](./automate-with-scripts-in-yaml)



---
url: /zh/llm-txt.md
---

# LLMs.txt 文档

如何让 Cursor、Windstatic、GitHub Copilot、ChatGPT 和 Claude 等工具理解 Midscene.js。

我们支持 LLMs.txt 文件，使 Midscene.js 的文档可供大型语言模型使用。

## 目录概览

以下文件可供使用：

- [llms.txt](https://midscenejs.com/zh/llms.txt)：主要的 LLMs.txt 文件
- [llms-full.txt](https://midscenejs.com/zh/llms-full.txt)：Midscene.js 的完整文档


## 使用方法

### Cursor

在 Cursor 中使用 `@Docs` 功能来将 LLMs.txt 文件包含到你的项目中。

[阅读更多](https://docs.cursor.com/context/@-symbols/@-docs)

### Windstatic

使用 `@` 或在你的 `.windsurfrules` 文件中引用 LLMs.txt 文件。

[阅读更多](https://docs.windsurf.com/windsurf/getting-started#memories-and-rules)





---
url: /zh/mcp-android.md
---



# MCP 服务

Midscene 提供了专门的 MCP 服务，允许 AI 助手通过自然语言命令控制 Android 设备，自动化执行移动应用测试任务。

:::info 什么是 MCP
[MCP](https://modelcontextprotocol.io/introduction) 是一种标准化的方式，使 AI 模型能够与外部工具和功能进行交互。MCP 服务器暴露一组工具后，AI 模型可以调用这些工具来执行各种任务。对于 Midscene 来说，这些工具允许 AI 模型连接 Android 设备、启动应用、与 UI 元素交互等等。
:::

## 使用场景

- 在 Android 设备上执行自动化测试
- 控制 Android 应用进行 UI 交互

## 设置 Midscene MCP

### 前提条件

1. OpenAI API 密钥或其他支持的 AI 模型提供商，更多信息请查看 [选择 AI 模型](./model-config.mdx)。
2. [Android adb](https://developer.android.com/tools/adb?hl=zh-cn) 工具已安装并配置
3. Android 设备已启用 USB 调试模式并连接到电脑

### 配置

将 Midscene MCP 服务器添加到你的 MCP 配置中，注意不要遗漏 `MIDSCENE_MCP_ANDROID_MODE` 环境变量：

```json
{
  "mcpServers": {
    "mcp-midscene": {
      "command": "npx",
      "args": ["-y", "@midscene/mcp"],
      "env": {
        "MIDSCENE_MODEL_NAME": "REPLACE_WITH_YOUR_MODEL_NAME",
        "OPENAI_API_KEY": "REPLACE_WITH_YOUR_OPENAI_API_KEY",
        "MIDSCENE_MCP_ANDROID_MODE": "true",
        "MCP_SERVER_REQUEST_TIMEOUT": "800000"
      }
    }
  }
}
```

其中有关配置 AI 模型的信息，请参阅[选择 AI 模型](./model-config.mdx)。

## 可用工具

Midscene MCP 提供以下 Android 设备自动化工具：

| 功能分类       | 工具名称                      | 功能描述                            |
| -------------- | ----------------------------- | ----------------------------------- |
| **设备管理**   | midscene_android_list_devices | 列出所有已连接的 Android 设备       |
|                | midscene_android_connect      | 连接到指定的 Android 设备           |
| **应用控制**   | midscene_android_launch       | 在 Android 设备上启动应用或打开网页 |
| **系统操作**   | midscene_android_back         | 按下 Android 设备的返回键           |
|                | midscene_android_home         | 按下 Android 设备的主页键           |
| **页面交互**   | midscene_aiTap                | 点击通过自然语言描述的元素          |
|                | midscene_aiInput              | 在表单字段或元素中输入文本          |
|                | midscene_aiKeyboardPress      | 按下特定键盘按键                    |
|                | midscene_aiScroll             | 滚动页面或特定元素                  |
| **验证和观察** | midscene_aiWaitFor            | 等待页面上的条件为真                |
|                | midscene_aiAssert             | 断言页面上的条件为真                |
|                | midscene_screenshot           | 对当前页面截图                      |

### 设备管理

- **midscene_android_list_devices**：列出所有已连接的 Android 设备

  ```
  参数：无
  ```

- **midscene_android_connect**：连接到指定的 Android 设备
  ```
  参数：
  - deviceId：（可选）要连接的设备 ID。如果未提供，使用第一个可用设备
  - displayId：（可选）多屏 Android 设备的显示屏 ID（如 0、1、2），当指定时，所有 ADB 输入操作将针对此特定显示屏
  - alwaysRefreshScreenInfo：（可选）是否每次都重新获取屏幕尺寸和方向信息。默认为 false（使用缓存以提高性能）。如果设备可能会旋转或需要实时屏幕信息，设置为 true
  ```

### 应用控制

- **midscene_android_launch**：在 Android 设备上启动应用或打开网页
  ```
  参数：
  - uri：要启动的应用包名、Activity 名称或要打开的网页 URL
  ```

### 系统操作

- **midscene_android_back**：按下 Android 设备的返回键

  ```
  参数：无
  ```

- **midscene_android_home**：按下 Android 设备的主页键
  ```
  参数：无
  ```

### 页面交互

- **midscene_aiTap**：点击通过自然语言描述的元素

  ```
  参数：
  - locate：要点击元素的自然语言描述
  ```

- **midscene_aiInput**：在表单字段或元素中输入文本

  ```
  参数：
  - value：要输入的文本
  - locate：要输入文本的元素的自然语言描述
  ```

- **midscene_aiKeyboardPress**：按下特定键盘按键

  ```
  参数：
  - key：要按下的按键（例如 'Enter'、'Tab'、'Escape'）
  - locate：（可选）在按键前要聚焦的元素描述
  - deepThink：（可选）如果为 true，使用更精确的元素定位
  ```

- **midscene_aiScroll**：滚动页面或特定元素
  ```
  参数：
  - direction：'up'、'down'、'left' 或 'right'
  - scrollType：'once'、'untilBottom'、'untilTop'、'untilLeft' 或 'untilRight'
  - distance：（可选）以像素为单位的滚动距离
  - locate：（可选）要滚动的元素描述
  - deepThink：（可选）如果为 true，使用更精确的元素定位
  ```

### 验证和观察

- **midscene_aiWaitFor**：等待页面上的条件为真

  ```
  参数：
  - assertion：要等待的条件的自然语言描述
  - timeoutMs：（可选）最大等待时间（毫秒）
  - checkIntervalMs：（可选）检查条件的频率
  ```

- **midscene_aiAssert**：断言页面上的条件为真

  ```
  参数：
  - assertion：要检查的条件的自然语言描述
  ```

- **midscene_screenshot**：对当前页面截图
  ```
  参数：
  - name：截图的名称
  ```

## 常见问题

### 如何连接 Android 设备？

1. 确保已安装 Android SDK 并配置 ADB
2. 在 Android 设备上启用开发者选项和 USB 调试
3. 使用 USB 线连接设备到电脑
4. 运行 `adb devices` 确认设备已连接
5. 在 MCP 中使用 `midscene_android_list_devices` 查看可用设备

### 如何启动 Android 应用？

使用 `midscene_android_launch` 工具，参数可以是：

- 应用包名：如 `com.android.chrome`
- Activity 名称：如 `com.android.chrome/.MainActivity`
- 网页 URL：如 `https://www.example.com`

### 本地如果出现多个 Client 会导致 Server port 占用

> 问题描述

当用户在本地多个 Client （Claude Desktop、Cursor MCP、） 中同时使用了 Midscene MCP 将会出现端口占用导致服务报错

> 如何解决

- 将多余的 client 中的 MCP server 暂时先关闭
- 执行命令

```bash
# For macOS/Linux:
lsof -i:3766 | awk 'NR>1 {print $2}' | xargs -r kill -9

# For Windows:
FOR /F "tokens=5" %i IN ('netstat -ano ^| findstr :3766') DO taskkill /F /PID %i
```

### 如何获取 Midscene 执行的报告

在每次执行完任务后都会生成 Midscene 任务报告，可以在命令行直接打开该 html 报告

```bash
# 将打开的地址替换为你的报告文件名
open report_file_name.html
```

![image](https://lf3-static.bytednsdoc.com/obj/eden-cn/ozpmyhn_lm_hymuPild/ljhwZthlaukjlkulzlp/midscene/image.png)



---
url: /zh/mcp.md
---


import McpSharedTools from './common/mcp-shared-tools.mdx';
import McpReport from './common/mcp-report.mdx';

# 将设备暴露为 MCP 服务

[MCP](https://modelcontextprotocol.io/introduction)（Model Context Protocol）是一套协议标准，让 AI 模型可以与外部工具和能力进行交互。

Midscene 提供了 MCP 服务，可以将 Midscene Agent 中的原子化操作（即 Action Space 中的每个 Action）暴露为 MCP 工具，让上层 Agent 可以通过自然语言来查看界面、精准操作 UI 界面、执行自动化任务等，而无需理解复杂的底层实现。

由于 Midscene Agent 依赖于视觉模型，因此你需要在 MCP 服务中配置 Midscene 所需的环境变量，而不是复用上层 Agent 的模型配置。

## MCP 工具列表

| 工具名称 | 功能描述 |
|---------|---------|
| 设备连接，如 `web_connect`、`ios_connect`、`android_connect` | 连接到目标设备，如浏览器、iOS 设备、Android 设备 |
| `take_screenshot` | 获取最新截图 |
| 设备操作 | 对应 Action Space 中的每个 Action，如 `Tap`、`Scroll` 等 |

## 查看执行报告

每次交互操作执行结束，都会生成一份 Midscene 任务报告。可直接在命令行打开：

```bash
open report_file_name.html
```

报告中包含了交互操作的详细信息，包括截图、操作日志、错误信息等，便于调试和问题排查。


## 配置 MCP

### 浏览器桥接模式

`@midscene/web-bridge-mcp` 支持将 [Chrome 插件的桥接模式](./bridge-mode)发布为 MCP 服务。

**环境准备**

参考 [Chrome 桥接模式](./bridge-mode)，确保浏览器插件可以启动，并且已经在桥接模式下点击了「允许连接」。

**配置**

在 MCP 客户端中添加 Midscene Web Bridge MCP 服务器 （ `@midscene/web-bridge-mcp` ）。其中模型配置的参数请参考 [模型策略](./model-strategy)。

```json
{
  "mcpServers": {
    "midscene-web": {
      "command": "npx",
      "args": ["-y", "@midscene/web-bridge-mcp"],
      "env": {
        "MIDSCENE_MODEL_BASE_URL": "替换为你的模型服务地址",
        "MIDSCENE_MODEL_API_KEY": "替换为你的 API Key",
        "MIDSCENE_MODEL_NAME": "替换为你的模型名称",
        "MIDSCENE_MODEL_FAMILY": "替换为你的模型系列",
        "MCP_SERVER_REQUEST_TIMEOUT": "600000"
      }
    }
  }
}
```

### iOS MCP 服务

**环境准备**

- **AI 模型服务**：准备 OpenAI API Key 或其他支持的 AI 模型服务，更多信息参见 [模型策略](./model-strategy)。
- **设备环境**：请按照 [iOS 快速开始](./ios-getting-started) 配置 WebDriverAgent、证书与设备连接，确保 WebDriverAgent 已正常运行。可以在 [iOS Playground](./ios-getting-started#试用-playground) 中验证截图和基础操作是否正常。

**配置**

在 MCP 客户端中添加 Midscene iOS MCP 服务器（ `@midscene/ios-mcp` ）。其中模型配置的参数请参考 [模型策略](./model-strategy)。

```json
{
  "mcpServers": {
    "midscene-ios": {
      "command": "npx",
      "args": ["-y", "@midscene/ios-mcp"],
      "env": {
        "MIDSCENE_MODEL_BASE_URL": "替换为你的模型服务地址",
        "MIDSCENE_MODEL_API_KEY": "替换为你的 API Key",
        "MIDSCENE_MODEL_NAME": "替换为你的模型名称",
        "MIDSCENE_MODEL_FAMILY": "替换为你的模型系列",
        "MCP_SERVER_REQUEST_TIMEOUT": "800000"
      }
    }
  }
}
```


### Android MCP 服务

**环境准备**

- **AI 模型服务**：准备 OpenAI API Key 或其他支持的 AI 模型服务，更多信息参见 [模型策略](./model-strategy)。
- **设备环境**：请按照 [Android 快速开始](./android-getting-started) 配置 adb 工具与设备连接，确保 `adb devices` 可以识别目标设备。可以用 [Android Playground](./android-getting-started#试用-playground-零代码) 获取截图并执行简单操作来检验环境。

**配置**

在 MCP 客户端中添加 Midscene Android MCP 服务器（ `@midscene/android-mcp` ）。其中模型配置的参数请参考 [模型策略](./model-strategy)。

```json
{
  "mcpServers": {
    "midscene-android": {
      "command": "npx",
      "args": ["-y", "@midscene/android-mcp"],
      "env": {
        "MIDSCENE_MODEL_BASE_URL": "替换为你的模型服务地址",
        "MIDSCENE_MODEL_API_KEY": "替换为你的 API Key",
        "MIDSCENE_MODEL_NAME": "替换为你的模型名称",
        "MIDSCENE_MODEL_FAMILY": "替换为你的模型系列",
        "MCP_SERVER_REQUEST_TIMEOUT": "800000"
      }
    }
  }
}
```



---
url: /zh/model-common-config.md
---

import TroubleshootingLLMConnectivity from './common/troubleshooting-llm-connectivity.mdx';

# 常用模型配置

## 配置环境变量的方式

请将所有模型配置项放置在系统环境变量中，Midscene 会自动读取这些环境变量。

以下介绍一些常见方法，你也可以使用自己项目中的其他配置方案。

### 方法一：在系统中设置环境变量

> 在 Midscene Chrome 插件中，你也可以使用这种 `export KEY="value"` 配置格式

```bash
# 替换为你自己的 API Key
export MIDSCENE_MODEL_BASE_URL="https://.../compatible-mode/v1"
export MIDSCENE_MODEL_API_KEY="sk-abcde..."
export MIDSCENE_MODEL_NAME="qwen3-vl-plus"
export MIDSCENE_MODEL_FAMILY="qwen3-vl"
```

### 方法二：编写 `.env` 文件（适用于命令行工具）

在项目的运行路径下创建一个 `.env` 文件，并添加以下内容，Midscene 的命令行工具默认会读取这个文件。

```bash
MIDSCENE_MODEL_BASE_URL="https://.../compatible-mode/v1"
MIDSCENE_MODEL_API_KEY="sk-abcdefghijklmnopqrstuvwxyz"
MIDSCENE_MODEL_NAME="qwen3-vl-plus"
MIDSCENE_MODEL_FAMILY="qwen3-vl"
```

请注意：
1. 这里不需要在每一行前添加 `export`
2. 只有 Midscene 命令行工具会默认读取这个文件，如果是 JavaScript SDK，请参考下一条自行手动加载

### 方法三：引用 dotenv 库配置环境变量

[Dotenv](https://www.npmjs.com/package/dotenv) 是一个零依赖的 npm 包，用于将环境变量从 `.env` 文件加载到 node.js 的环境变量参数 `process.env` 中。

我们的 [demo 项目](https://github.com/web-infra-dev/midscene-example) 使用了这种方式。

```bash
# 安装 dotenv
npm install dotenv --save
```

在项目根目录下创建一个 `.env` 文件，并添加以下内容。注意这里不需要在每一行前添加 `export`。

```bash
MIDSCENE_MODEL_API_KEY="sk-abcdefghijklmnopqrstuvwxyz"
```

在脚本中导入 dotenv 模块，导入后它会自动读取 `.env` 文件中的环境变量。

```typescript
import 'dotenv/config';
```


## 常用模型配置

### 豆包 Seed 模型 {#doubao-seed-model}

从 [火山引擎](https://volcengine.com) 获取 API 密钥，然后补充以下环境变量：

```bash
MIDSCENE_MODEL_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
MIDSCENE_MODEL_API_KEY="...."
MIDSCENE_MODEL_NAME="ep-..." # 来自火山引擎的推理接入点 ID 或模型名称
MIDSCENE_MODEL_FAMILY="doubao-vision"
```

### 千问 Qwen3-VL {#qwen3-vl}

以阿里云 `qwen3-vl-plus` 模型为例，它的环境变量配置如下：

```bash
MIDSCENE_MODEL_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
MIDSCENE_MODEL_API_KEY="......"
MIDSCENE_MODEL_NAME="qwen3-vl-plus"
MIDSCENE_MODEL_FAMILY="qwen3-vl"
```

### 千问 Qwen2.5-VL {#qwen25-vl}

以阿里云 `qwen-vl-max-latest` 模型为例，它的环境变量配置如下：

```bash
MIDSCENE_MODEL_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
MIDSCENE_MODEL_API_KEY="......"
MIDSCENE_MODEL_NAME="qwen-vl-max-latest"
MIDSCENE_MODEL_FAMILY="qwen2.5-vl"
```

### Gemini-3-Pro and Gemini-3-Flash {#gemini-3-pro}

在 [Google Gemini](https://gemini.google.com/) 上申请 API 密钥后，可以使用以下配置。`MIDSCENE_MODEL_NAME` 请填写你使用的 Gemini-3-Pro 或 Gemini-3-Flash 具体模型名：

```bash
MIDSCENE_MODEL_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
MIDSCENE_MODEL_API_KEY="......"
MIDSCENE_MODEL_NAME="gemini-3.0-pro" # 或 gemini-3-flash 的具体模型名
MIDSCENE_MODEL_FAMILY="gemini"
```

### UI-TARS {#ui-tars}

你可以在 [火山引擎](https://volcengine.com) 上使用已部署的 `doubao-1.5-ui-tars`。

```bash
MIDSCENE_MODEL_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
MIDSCENE_MODEL_API_KEY="...."
MIDSCENE_MODEL_NAME="ep-2025..." # 来自火山引擎的推理接入点 ID 或模型名称
MIDSCENE_MODEL_FAMILY="vlm-ui-tars-doubao-1.5"
```

**关于 `MIDSCENE_MODEL_FAMILY` 配置**

`MIDSCENE_MODEL_FAMILY` 用于指定 UI-TARS 版本，使用以下值之一：
- `vlm-ui-tars` - 用于模型版本 `1.0`
- `vlm-ui-tars-doubao` - 用于在火山引擎上部署的模型版本 `1.5`（与 `vlm-ui-tars-doubao-1.5` 等效）
- `vlm-ui-tars-doubao-1.5` - 用于在火山引擎上部署的模型版本 `1.5`

:::tip

旧版本使用 `MIDSCENE_USE_VLM_UI_TARS=DOUBAO` 或 `MIDSCENE_USE_VLM_UI_TARS=1.5` 配置，该配置仍然兼容但已废弃，建议迁移到 `MIDSCENE_MODEL_FAMILY`。

迁移对应关系：
- `MIDSCENE_USE_VLM_UI_TARS=1.0` → `MIDSCENE_MODEL_FAMILY="vlm-ui-tars"`
- `MIDSCENE_USE_VLM_UI_TARS=1.5` → `MIDSCENE_MODEL_FAMILY="vlm-ui-tars-doubao-1.5"`
- `MIDSCENE_USE_VLM_UI_TARS=DOUBAO` → `MIDSCENE_MODEL_FAMILY="vlm-ui-tars-doubao"`

:::

### ~~GPT-4o~~

从 1.0 版本开始，Midscene 不再支持使用 GPT-4o 作为 UI 操作的规划模型。详见：[模型策略](./model-strategy)。

## 多模型示例：GPT-5.1 用于 Planning/Insight，Qwen3-VL 负责视觉 {#gpt51-planning-insight-qwen3}

使用 GPT-5.1 处理重度推理（Planning 和/或 Insight），让 Qwen3-VL 专注视觉定位。独立的 Planning 和 Insight 模型可按需启用，不需要同时开启。

```bash
# 默认视觉模型：Qwen3-VL
export MIDSCENE_MODEL_BASE_URL="https://..."       # Qwen3-VL 接口地址
export MIDSCENE_MODEL_API_KEY="..."                # 你的 Qwen3-VL API Key
export MIDSCENE_MODEL_NAME="qwen3-vl-plus"
export MIDSCENE_MODEL_FAMILY="qwen3-vl"

# Planning 模型：GPT-5.1
export MIDSCENE_PLANNING_MODEL_API_KEY="sk-..."    # 你的 GPT-5.1 API Key
export MIDSCENE_PLANNING_MODEL_BASE_URL="https://..."
export MIDSCENE_PLANNING_MODEL_NAME="gpt-5.1"

# Insight 模型：GPT-5.1
export MIDSCENE_INSIGHT_MODEL_API_KEY="sk-..."     # 你的 GPT-5.1 API Key
export MIDSCENE_INSIGHT_MODEL_BASE_URL="https://..."
export MIDSCENE_INSIGHT_MODEL_NAME="gpt-5.1"
```

## 更多

更多高阶配置请查看 [模型配置](./model-config) 文档。

<TroubleshootingLLMConnectivity />



---
url: /zh/model-config.md
---

# 模型配置

Midscene 通过读取操作系统中指定的环境变量来完成配置。

Midscene 默认集成了 OpenAI SDK 调用 AI 服务，它限定了推理服务的参数风格，绝大多数模型服务商（或模型部署工具）都提供了满足这种要求的接口。

本篇文档会重点介绍 Midscene 的模型配置参数。如果你对 Midscene 的模型策略感兴趣，请阅读 [模型策略](./model-strategy)。如果你想查看常用模型的配置示例，请阅读 [常用模型配置](./model-common-config)。

## 必选配置

你需要为 Midscene 配上一个默认模型，详见 [模型策略](./model-strategy) 文档。

| 名称 | 描述 |
|------|-------------|
| `MIDSCENE_MODEL_API_KEY` | 模型 API Key，如 "sk-abcd..." |
| `MIDSCENE_MODEL_BASE_URL` | API 的接入 URL，常见以版本号结尾（如`/v1`）；不需要编写最后的 `/chat/completion` 部分，底层 SDK 会自动添加 |
| `MIDSCENE_MODEL_NAME` | 模型名称 |
| `MIDSCENE_MODEL_FAMILY` | 模型系列，用于确定坐标处理方式 |

## 高阶配置（可选）

| 名称 | 描述 |
|------|-------------|
| `MIDSCENE_MODEL_TIMEOUT` | AI 接口调用超时时间（毫秒，默认意图），默认使用 OpenAI SDK 默认值（10 分钟）|
| `MIDSCENE_MODEL_MAX_TOKENS` | 模型响应的 max_tokens 数配置，默认是 2048 |
| `MIDSCENE_MODEL_HTTP_PROXY` | HTTP/HTTPS 代理配置，如 `http://127.0.0.1:8080` 或 `https://proxy.example.com:8080`，优先级高于 `MIDSCENE_MODEL_SOCKS_PROXY` |
| `MIDSCENE_MODEL_SOCKS_PROXY` | SOCKS 代理配置，如 `socks5://127.0.0.1:1080` |
| `MIDSCENE_MODEL_INIT_CONFIG_JSON` | 覆盖 OpenAI SDK 初始化配置的 JSON |
| `MIDSCENE_RUN_DIR` | 运行产物目录，默认值为当前工作目录下的 `midscene_run`，支持设置绝对路径或相对路径 |
| `MIDSCENE_PREFERRED_LANGUAGE` | 可选，模型响应的语言；如果当前系统时区是 GMT+8 则默认是 `Chinese`，否则是 `English` |

> 提示：通过 Agent 的 `replanningCycleLimit` 入参控制重规划次数（默认 20，`vlm-ui-tars` 为 40），不再使用环境变量。

### 为 Insight 意图单独配置模型

如果你想为 Insight 意图单独配置模型，需额外配置以下字段：

| 名称 | 描述 |
|------|-------------|
| `MIDSCENE_INSIGHT_MODEL_API_KEY` | API Key |
| `MIDSCENE_INSIGHT_MODEL_BASE_URL` | API 的接入 URL，常见以版本号结尾（如`/v1`）；不需要编写最后的 `/chat/completion` 部分 |
| `MIDSCENE_INSIGHT_MODEL_NAME` | 模型名称 |
| `MIDSCENE_INSIGHT_MODEL_TIMEOUT` | 可选，Insight 意图的 AI 接口调用超时时间（毫秒）|
| `MIDSCENE_INSIGHT_MODEL_HTTP_PROXY` | 可选，效果等同于 `MIDSCENE_MODEL_HTTP_PROXY` |
| `MIDSCENE_INSIGHT_MODEL_SOCKS_PROXY` | 可选，效果等同于 `MIDSCENE_MODEL_SOCKS_PROXY`  |
| `MIDSCENE_INSIGHT_MODEL_INIT_CONFIG_JSON` | 可选，效果等同于 `MIDSCENE_MODEL_INIT_CONFIG_JSON`  |

### 为 Planning 意图单独配置模型

如果你想为 Planning 意图单独配置模型，需额外配置以下字段：

| 名称 | 描述 |
|------|-------------|
| `MIDSCENE_PLANNING_MODEL_API_KEY` | API Key |
| `MIDSCENE_PLANNING_MODEL_BASE_URL` | API 的接入 URL，常见以版本号结尾（如`/v1`）；不需要编写最后的 `/chat/completion` 部分 |
| `MIDSCENE_PLANNING_MODEL_NAME` | 模型名称 |
| `MIDSCENE_PLANNING_MODEL_TIMEOUT` | 可选，Planning 意图的 AI 接口调用超时时间（毫秒）|
| `MIDSCENE_PLANNING_MODEL_HTTP_PROXY` | 可选，效果等同于 `MIDSCENE_MODEL_HTTP_PROXY` |
| `MIDSCENE_PLANNING_MODEL_SOCKS_PROXY` | 可选，效果等同于 `MIDSCENE_MODEL_SOCKS_PROXY`  |
| `MIDSCENE_PLANNING_MODEL_INIT_CONFIG_JSON` | 可选，效果等同于 `MIDSCENE_MODEL_INIT_CONFIG_JSON`  |

### 调试日志开关

通过设置以下配置，可以在命令行打印更多调试日志。
无论是否配置，这些日志都会打印在 `./midscene_run/log` 文件夹中。

| 名称 | 描述 |
|------|-------------|
| `DEBUG=midscene:ai:profile:stats` | 打印 AI 服务消耗的时间、token 使用情况，用逗号分隔，便于分析 |
| `DEBUG=midscene:ai:profile:detail` | 打印 AI token 消耗信息的详细日志 |
| `DEBUG=midscene:ai:call` | 打印 AI 响应详情 |
| `DEBUG=midscene:android:adb` | 打印 Android adb 命令调用详情 |
| `DEBUG=midscene:*` | 打印所有调试日志 |


## 仍兼容的模型配置（不推荐）

以下环境变量已废弃但仍然兼容，建议尽快迁移到新的配置方式。

### Planning 模型配置

| 名称 | 描述 | 新配置方式 |
|------|-------------|-----------|
| `MIDSCENE_USE_DOUBAO_VISION` | 已弃用。启用豆包视觉模型 | 使用 `MIDSCENE_MODEL_FAMILY="doubao-vision"` |
| `MIDSCENE_USE_QWEN3_VL` | 已弃用。启用千问 Qwen3-VL 模型 | 使用 `MIDSCENE_MODEL_FAMILY="qwen3-vl"` |
| `MIDSCENE_USE_QWEN_VL` | 已弃用。启用千问 Qwen2.5-VL 模型 | 使用 `MIDSCENE_MODEL_FAMILY="qwen2.5-vl"` |
| `MIDSCENE_USE_GEMINI` | 已弃用。启用 Gemini 模型 | 使用 `MIDSCENE_MODEL_FAMILY="gemini"` |
| `MIDSCENE_USE_VLM_UI_TARS` | 已弃用。启用 UI-TARS 模型 | 使用 `MIDSCENE_MODEL_FAMILY="vlm-ui-tars"` |

### 通用配置

| 名称 | 描述 | 新配置方式 |
|------|-------------|-----------|
| `OPENAI_API_KEY` | 已弃用但仍兼容 | 使用 `MIDSCENE_MODEL_API_KEY` |
| `OPENAI_BASE_URL` | 已弃用但仍兼容 | 使用 `MIDSCENE_MODEL_BASE_URL` |
| `MIDSCENE_OPENAI_INIT_CONFIG_JSON` | 已弃用但仍兼容 | 使用 `MIDSCENE_MODEL_INIT_CONFIG_JSON` |
| `MIDSCENE_OPENAI_HTTP_PROXY` | 已弃用但仍兼容 | 使用 `MIDSCENE_MODEL_HTTP_PROXY` |
| `MIDSCENE_OPENAI_SOCKS_PROXY` | 已弃用但仍兼容 | 使用 `MIDSCENE_MODEL_SOCKS_PROXY` |
| `OPENAI_MAX_TOKENS` | 已弃用但仍兼容 | 使用 `MIDSCENE_MODEL_MAX_TOKENS` |

## 使用 JavaScript 配置参数

你也可以使用 JavaScript 来为每个 Agent 配置模型参数，详见 [API 参考](./api)

```typescript
const agent = new Agent(page, {
  // 通过 modelConfig 配置
  modelConfig: {
    MIDSCENE_MODEL_TIMEOUT: '60000', // 60 秒
    MIDSCENE_MODEL_NAME: 'qwen3-vl-plus',
    // ... 其他配置
  }
});
```

## 常见问题

### 如何查看模型的 token 使用情况？

通过在环境变量中设置 `DEBUG=midscene:ai:profile:stats`，你可以打印模型的使用信息和响应时间。

你也可以在报告文件中查看模型的使用量统计。

### 使用 LangSmith

LangSmith 是一个用于调试大语言模型的平台。Midscene 提供了自动集成支持，只需安装依赖并设置环境变量即可。

**步骤 1：安装依赖**

```bash
npm install langsmith
```

**步骤 2：设置环境变量**

```bash
# 启用 Midscene 的 LangSmith 自动集成
export MIDSCENE_LANGSMITH_DEBUG=1

# LangSmith 配置
export LANGCHAIN_API_KEY="your-langchain-api-key-here"
export LANGCHAIN_TRACING=true
export LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
# export LANGCHAIN_ENDPOINT="https://eu.api.smith.langchain.com" # 如果在欧洲区域注册
```

启动 Midscene 后，你应该会看到类似如下的日志：

```log
DEBUGGING MODE: langsmith wrapper enabled
```

注意：
- LangSmith 和 Langfuse 可以同时启用
- 仅支持 Node.js 环境，浏览器环境会报错
- 如果使用 [`createOpenAIClient`](./api#自定义-openai-客户端) 参数，环境变量方式会被覆盖

如果需要更细粒度的控制（例如只对特定任务启用 LangSmith），可以通过 [`createOpenAIClient`](./api#自定义-openai-客户端) 手动包装客户端。

### 使用 Langfuse

Langfuse 是另一个流行的 LLM 可观测性平台。集成方式与 LangSmith 类似。

**步骤 1：安装依赖**

```bash
npm install langfuse
```

**步骤 2：设置环境变量**

```bash
# 启用 Midscene 的 Langfuse 自动集成
export MIDSCENE_LANGFUSE_DEBUG=1

# Langfuse 配置
export LANGFUSE_PUBLIC_KEY="your-langfuse-public-key-here"
export LANGFUSE_SECRET_KEY="your-langfuse-secret-key-here"
export LANGFUSE_BASE_URL="https://cloud.langfuse.com" # 🇪🇺 欧洲区域
# export LANGFUSE_BASE_URL="https://us.cloud.langfuse.com" # 🇺🇸 美国区域
```

启动 Midscene 后，你应该会看到类似如下的日志：

```log
DEBUGGING MODE: langfuse wrapper enabled
```

注意：
- LangSmith 和 Langfuse 可以同时启用
- 仅支持 Node.js 环境，浏览器环境会报错
- 如果使用 [`createOpenAIClient`](./api#自定义-openai-客户端) 参数，环境变量方式会被覆盖



---
url: /zh/model-strategy.md
---



# 模型策略

:::info 快速开始

如果你想快速开始体验 Midscene，请选择模型并参考配置文档：
* [豆包 Seed 模型](./model-common-config#doubao-seed-model)
* [千问 Qwen3-VL](./model-common-config#qwen3-vl)
* [千问 Qwen2.5-VL](./model-common-config#qwen25-vl)
* [Gemini-3-Pro / Gemini-3-Flash](./model-common-config#gemini-3-pro)
* [UI-TARS](./model-common-config#ui-tars)

:::

本篇文档会重点介绍 Midscene 的模型选用策略。如果你需要进行模型配置，请参考 [模型配置](./model-config)。

## 背景知识：UI 自动化的技术路线

使用 AI 模型驱动 UI 自动化的有两个关键点：规划合理的操作路径，以及准确找到需要交互的元素。在实践中，操作路径的分析效果可以通过调整自然语言来优化，一般不会成为难点。而“元素定位”由于极度依赖模型本身的推理效果，它的成功率会成为很多项目在启动之初的最大拦路虎。

为了完成元素定位工作，UI 自动化框架一般有两种技术路线：

* 基于 DOM + 截图标注：提前提取页面的 DOM 结构，结合截图做好标注，请模型“挑选”其中的内容。
* 纯视觉：利用模型的视觉定位能力，基于截图完成所有分析工作，即模型收到的只有图片，没有 DOM，也没有标注信息。

## Midscene 采用纯视觉路线来完成元素定位

Midscene 早期同时兼容上述两种技术路线，交由开发者自行选择比对。但在几十个版本迭代、上百个项目的观察后，我们发现“纯视觉”方案开始体现出优越性：

- **效果稳定**：这些模型在 UI 操作规划、组件定位、界面理解等领域的综合表现较好，能够帮助开发者更快上手。
- **适用于任意系统**：自动化框架不再依赖 UI 渲染的技术栈。无论是 Android、iOS、桌面应用，还是浏览器中的 canvas 标签，只要能获取截图，Midscene 即可完成交互操作。
- **易于编写**：抛弃各类 selector 和 DOM 之后，开发者与模型的“磨合”会变得更简单，不熟悉渲染技术的新人也能很快上手。
- **token 量显著下降**：在去除 DOM 提取之后，视觉方案的 token 使用量可以减少 80%，成本更低，且本地运行速度也变得更快。
- **有开源模型解决方案**：开源模型表现渐佳，开发者开始有机会进行私有化部署模型，如 Qwen3-VL 提供的 8B、30B 等版本在不少项目中都有着不错的效果

综合上述情况，**从 1.0 版本开始，Midscene 只支持纯视觉方案**，不再提供“提取 DOM”的兼容模式。这一限制针对 UI 操作与元素定位；在数据提取或页面理解场景中，仍可按需附带 DOM 信息。

## 推荐使用的视觉模型

经过大量项目实测，我们推荐使用这些模型作为使用 Midscene 的默认模型：豆包 Seed，千问 VL，Gemini-3（Pro/Flash），UI-TARS。

这些模型都具备良好的“元素定位”能力，且在任务规划、界面理解等场景上也有不错的表现。

如果你不知道从哪里开始，选用你眼下最容易获得的模型即可，然后在后续迭代中再进行横向比对。

|模型系列|部署|Midscene 评价|
|---|---|---|
|豆包 Seed 模型<br />[快速配置](./model-common-config#doubao-seed-model)|火山引擎版本：<br />[Doubao-seed-1.8](https://www.volcengine.com/docs/82379/2123228)<br/>[Doubao-Seed-1.6-Vision](https://www.volcengine.com/docs/82379/1799865)|⭐⭐⭐⭐<br/>UI 操作规划、定位能力较强<br />速度略慢|
|千问 Qwen3-VL<br />[快速配置](./model-common-config#qwen3-vl)|[阿里云](https://help.aliyun.com/zh/model-studio/vision)<br/>[OpenRouter](https://openrouter.ai/qwen)<br/>[Ollama(开源)](https://ollama.com/library/qwen3-vl)|⭐⭐⭐⭐<br />复杂场景断言能力不够稳定 <br/>性能超群，操作准确<br />有开源版本（[HuggingFace](https://huggingface.co/Qwen) / [Github](https://github.com/QwenLM/)）|
|千问 Qwen2.5-VL<br />[快速配置](./model-common-config#qwen25-vl)|[阿里云](https://help.aliyun.com/zh/model-studio/vision)<br/>[OpenRouter](https://openrouter.ai/qwen)|⭐⭐⭐<br/>综合效果不如 Qwen3-VL |
|Gemini-3-Pro / Gemini-3-Flash<br />[快速配置](./model-common-config#gemini-3-pro)|[Google Cloud](https://ai.google.dev/gemini-api/docs/models/gemini)|⭐⭐⭐<br />支持 Gemini-3-Flash<br />价格高于豆包和千问|
|UI-TARS <br />[快速配置](./model-common-config#ui-tars)|[火山引擎](https://www.volcengine.com/docs/82379/1536429)|⭐⭐<br /> 有探索能力，但在不同场景表现可能差异较大<br />有开源版本（[HuggingFace](https://huggingface.co/bytedance-research/UI-TARS-72B-SFT) / [Github](https://github.com/bytedance/ui-tars)） |

:::info 为什么不能使用 gpt-5 这样的多模态模型作为默认模型 ?

Midscene 对模型的 UI 定位能力（也称之为 Visual Grounding 特性）要求很高，gpt-5 一类的模型在此类场景表现很差，无法作为默认模型。但你可以考虑把它作为专用的“规划模型”，我们会在后文提到。

:::

## 高阶特性：多模型配合

Midscene 的默认模型策略在很大程度上解决了 UI 自动化项目启动阶段的问题。但随着开发者提交的任务和上下文越加复杂、希望有泛化理解能力时，默认模型的规划能力可能难以应对。我们以这个注册 Github 账号的 Prompt 为例：

```text
完成 github 账号注册的表单填写，确保表单上没有遗漏的字段，选择“美国”作为地区。

确保所有的表单项能够通过校验。

只需要填写表单项即可，不需要发起真实的账号注册。

最终返回表单上实际填写的字段内容。
```

这个诉求看似简单，但实际要求模型同时理解每个表单项的规则、理解每个控件、操作复杂的地区选择框、主动翻页和触发校验等操作，还要找到对应的元素。使用默认模型时，这些诉求可能难以同时满足，导致成功率较低。

面对此类场景，你可以为 *任务规划（Planning）*、*视觉理解（Insight）* 单独配置不同的模型，将默认模型仅用作为“视觉定位器”，以此降低推理的难度，发挥出各自的最大效果。多模型结合是当前提升 UI 自动化成功率最实用、最有效的手段。多模型的代价是速度和 token 消耗会略有上升。

想快速使用多模型组合配置，参考 [多模型配置示例](./model-common-config#gpt51-planning-insight-qwen3)。

### *Planning* 意图

在使用 `aiAct` 或 `ai` 任务规划任务时，你可以追加前缀为 `MIDSCENE_PLANNING_MODEL_` 的配置，来为任务规划（Planning）意图使用独立模型。

此处我们推荐使用 `gpt-5.1` 或其他理解 UI 交互的多模态模型。

### *Insight* 意图

Midscene 提供了基于页面理解的数据处理接口，如 AI 断言（`aiAssert`）、数据提取（`aiQuery`，`aiAsk`） 等，我们把这类意图归类为 *Insight*，它的效果取决于模型在视觉问答（VQA）领域的表现。

你可以追加前缀为 `MIDSCENE_INSIGHT_MODEL_` 的配置，来为视觉理解（Insight）意图使用独立模型。

此处我们推荐使用 `gpt-5.1` 或其他视觉问答（VQA）能力强的模型。

## 如何调优执行效果？

如果你在执行过程中遇到了成功率不满足需求的情况，可以尝试以下方法。

0. 查看 Midscene 的回放报告，确保任务执行的时序是正常的，没有进入错误的页面或逻辑分支
1. 使用最优质的、更新的、更大尺寸的模型版本，这会大幅改善 UI 自动化的成功率。比如 Qwen3-VL 的效果会优于 Qwen2.5-VL，同一个模型的 72B 版本准确性会优于 30B 版本
2. 确保模型的 `MIDSCENE_MODEL_FAMILY` 环境变量配置正确，否则定位结果会出现明显偏移
3. 尝试使用不同的模型，或尝试多模型组合，解决理解能力不足的问题

## 更多

### 使用视觉模型方案的不足

视觉模型更像是一种具有高度“通用性”的解决方案，它不依赖于具体的 UI 渲染技术栈，能完全基于截图进行分析，它能让开发者快速上手、快速调优，并扩展到任意应用场景。

对应的，它也存在一些不足，主要体现在对模型的要求偏高。

以移动端的 UI 自动化为例，如果界面上有组件树信息 + 完备的 a11y（无障碍）标注，开发者可以使用小尺寸的纯文本模型、基于组件结构推理来完成自动化任务，更有机会把性能做到极致。而纯视觉模型方案则忽略了这些信息，它省下了开发者标注界面的开发成本、更通用，但在运行时需要耗费更多的模型资源。

### 模型配置文档

请参考 [模型配置](./model-config)。

### 模型接口风格

Midscene 要求模型服务商提供兼容 OpenAI 风格的接口（这并不是说只能使用 OpenAI 的模型）。

绝大多数的服务商、部署工具都能满足这个要求。

### 如何查看模型的 token 使用情况？

在环境变量中设置 `DEBUG=midscene:ai:profile:stats`，即可打印模型的用量信息与响应时长。

你也可以在报告文件中查看模型的使用情况。

### "MIDSCENE_MODEL_FAMILY is required" 错误

如果收到了 "No visual language model (VL model) detected" 或 "MIDSCENE_MODEL_FAMILY is required" 错误，请确认已经正确配置 VL 模型的 `MIDSCENE_MODEL_FAMILY` 环境变量。

从 1.0 版本开始，Midscene 推荐使用 `MIDSCENE_MODEL_FAMILY` 来指定视觉模型类型。旧的 `MIDSCENE_USE_...` 配置仍然兼容但已废弃。

详细配置方法请参考 [模型配置](./model-config)。

### 是否可以为每个 Agent 实例单独配置模型？

可以，你可以为每个 Agent 实例单独配置模型，具体请参考 [API 参考](./api) 中的 `modelConfig` 参数。

### 希望将浏览器 DOM 信息发送给模型？

Midscene 默认不发送浏览器 DOM 信息给模型，如果你依然希望在进行界面理解时发送（如附加一些截图里不可见的信息），你可以在 `aiAsk` 或 `aiQuery` 等界面理解接口的 options 参数中设置 `domIncluded` 为 `true`，来发送浏览器 DOM 信息给模型。更多详情请参考 [API 参考](./api)。

### 早期版本兼容

从 1.0 版本开始，Midscene.js 推荐使用以下环境变量名，如：

- `MIDSCENE_MODEL_API_KEY`
- `MIDSCENE_MODEL_BASE_URL`

为了保持兼容，我们仍然支持下列 OpenAI 生态中的变量名，但不再推荐使用：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`

当新变量与 OpenAI 兼容变量同时设置时，Midscene 将优先使用新变量（`MIDSCENE_MODEL_*`）。

### 豆包手机是否使用了 Midscene 作为底层方案？

没有。

## 模型服务连接问题排查

如果你想排查模型服务的连通性问题，可以使用我们示例项目中的 'connectivity-test' 文件夹：[https://github.com/web-infra-dev/midscene-example/tree/main/connectivity-test](https://github.com/web-infra-dev/midscene-example/tree/main/connectivity-test)

将你的 `.env` 文件放在 `connectivity-test` 文件夹中，然后运行 `npm i && npm run test` 来进行测试。



---
url: /zh/quick-experience.md
---


import PrepareKeyForFurtherUse from './common/prepare-key-for-further-use.mdx';


# 通过 Chrome 插件快速体验

通过使用 Midscene.js Chrome 插件，你可以快速在任意网页上体验 Midscene 的主要功能，而无需编写任何代码。

该扩展与 npm `@midscene/web` 包共享了相同的代码，因此你可以将其视为 Midscene 的一个 Playground 或调试工具。

<video
src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupipfups/Midscene/recording_2025-07-07_08-16-16.mp4"
controls
/>


## 安装 Chrome 扩展

<a href="https://chromewebstore.google.com/detail/midscene/gbldofcpkknbggpkmbdaefngejllnief" target="_blank"><img src="https://lf3-static.bytednsdoc.com/obj/eden-cn/vhaeh7vhabf/chrome_extension_store_btn.png" width="200" /></a>

前往 Chrome 扩展商店安装 Midscene 扩展：[Midscene](https://chromewebstore.google.com/detail/midscene/gbldofcpkknbggpkmbdaefngejllnief)

启动扩展（可能默认折叠在 Chrome 扩展列表中），你应该能在浏览器右侧看到名为 “Midscene” 的侧边栏。

## 配置 AI 模型服务

将你的模型配置写入环境变量，可参考 [模型策略](../model-strategy) 了解更多细节。

```bash
export MIDSCENE_MODEL_BASE_URL="https://替换为你的模型服务地址/v1"
export MIDSCENE_MODEL_API_KEY="替换为你的 API Key"
export MIDSCENE_MODEL_NAME="替换为你的模型名称"
export MIDSCENE_MODEL_FAMILY="替换为你的模型系列"
```

更多配置信息请参考 [模型策略](../model-strategy) 和 [模型配置](../model-config)。


## 开始体验

配置完成后，你可以立即开始体验 Midscene。它提供了多个关键操作 Tab：

- **Act**: 与网页进行交互，这就是自动规划（Auto Planning），对应于 `aiAct` 方法。比如
```
在搜索框中输入 Midscene，执行搜索，跳转到第一条结果
```

```
填写完整的注册表单，注意主要让所有字段通过校验
```

- **Query**: 从界面中提取 JSON 结构的数据，对应于 `aiQuery` 方法。

类似的方法还有 `aiBoolean()`, `aiNumber()`, `aiString()`，用于直接提取布尔值、数字和字符串。

```
提取页面中的用户 ID，返回 { id: string } 结构的 JSON 数据
```


- **Assert**: 理解页面，进行断言，如果不满足则抛出错误，对应于 `aiAssert` 方法。

```
页面上存在一个登录按钮，它的下方有一个用户协议的链接
```

- **Tap**: 在某个元素上点击，这就是即时操作（Instant Action），对应于 `aiTap` 方法。
```
点击登录按钮
```

> 关于自动规划（Auto Planning）和即时操作（Instant Action）的区别，请参考 [API](../api.mdx) 文档。


## FAQ

### 是否可以手动安装 Chrome 扩展？

如果无法访问 Chrome 扩展商店，可以从 [Releases](https://github.com/web-infra-dev/midscene/releases) 下载安装包手动安装。但不推荐使用这种方式，因为无法获得自动更新。

### 插件运行失败，提示 'Cannot access a chrome-extension:// URL of different extension'

这一般是与其他插件冲突所致，如页面已经被其他插件注入了 `<iframe />` 或 `<script />`。

找到可疑插件：

1. 打开页面的调试器，找到被其他插件注入的 `<iframe />` 或 `<script />`，一般 URL 是 `chrome-extension://{这串就是ID}/...` 格式，复制其 ID。
2. 打开 `chrome://extensions/`，用 cmd+f 找到相同 ID 的插件，禁用它。
3. 刷新页面，再次尝试。



---
url: /zh/use-javascript-to-optimize-ai-automation-code.md
---

# 使用 JavaScript 优化 AI 自动化代码

许多开发者喜欢使用 `aiAct` 或 `ai` 来执行自动化任务，甚至将所有长段落复杂逻辑描述在一个自然语言指令中。这是很"智能"的做法，但在实际使用中可能遇到无法稳定复现、速度偏慢的问题。

本文为你介绍一种使用 JavaScript 和结构化 API 编写自动化脚本的思路，供开发者参考。

## 使用 JavaScript 和结构化 API 编写自动化脚本

Midscene 提供了结构化 API 方法，如 `aiBoolean` `aiString` `aiNumber`，用于提取界面上的状态。结合这些方法和即时操作方法，如 `aiTap` `aiInput` `aiScroll` `aiHover` 等，开发者可将复杂逻辑拆分为多个步骤，以提升自动化代码的稳定性。

### 简单的例子

以这个原始提示词为例：

```txt
逐条点击所有记录，如果一个记录包含“已完成”，则跳过
```

通过组装结构化 API，你可以将原始提示词转换为更可靠、更易于维护的代码：

```javascript
const recordList = await agent.aiQuery('string[], the record list')
for (const record of recordList) {
  const hasCompleted = await agent.aiBoolean(`check if the record ${record}" contains the text "completed"`)
  if (!hasCompleted) {
    await agent.aiTap(record)
  }
}
```

很显然，修改代码风格后，整个过程更可靠和易于维护，开发者可以用传统调试手段控制其中的执行流程。

### 复杂的例子

以下是修改前的代码：

```javascript
aiAct(`
1. 点击第一个未关注用户，进入用户主页
2. 点击关注按钮
3. 返回上一级
4. 如果所有用户都已关注，则向下滚动一屏
5. 重复上述步骤，直到所有用户都已关注
`)
```

使用结构化 API 后，开发者可以将这个流程固定为代码：

```javascript
let user = await agent.aiQuery('string[], 列表中所有未关注用户')
let currentUserIndex = 0

while (user.length > 0) {
  console.log('当前用户是', user[currentUserIndex])
  await agent.aiTap(user[currentUserIndex])
  try {
    await agent.aiTap('关注按钮')
  } catch (e) {
    // 忽略错误
  }
  // 返回上一级
  await agent.aiTap('返回按钮')
  
  currentUserIndex++

  // 检查是否已经遍历了当前列表中的所有用户
  if (currentUserIndex >= user.length) {
    // 向下滚动一屏
    await agent.aiScroll({
      direction: 'down',
      scrollType: 'once',
    })
    
    // 获取更新后的用户列表
    user = await agent.aiQuery('string[], 列表中所有未关注用户')
    currentUserIndex = 0
  }
}
```

## 常用的结构化 API 方法

### `aiBoolean` - 条件决策

* 适用场景：条件判断、状态检测
* 优势：将模糊描述转换为明确的布尔值

举例：
```javascript
const hasAlreadyChat = await agent.aiBoolean('当前聊天页面上，我是否给他发过消息');
if (hasAlreadyChat) {
   // ...
}
```

### `aiString` - 文本提取

* 适用场景：文本内容获取
* 优势：规避自然语言描述的歧义性

举例：
```javascript
const username = await agent.aiString('用户列表里的第一个用户昵称');
console.log('username is', username);
```

### `aiNumber` - 数值提取

* 适用场景：计数、数值比较、循环控制
* 优势：保证返回标准数字类型

举例：
```javascript
const unreadCount = await agent.aiNumber('消息图标上的未读数字');
for (let i = 0; i < unreadCount; i++) {
   // ...
}
``` 

### `aiQuery` - 通用数据提取

* 适用场景：提取任意数据类型
* 优势：灵活的数据类型处理

举例：
```javascript
const userList = await agent.aiQuery('string[], 用户列表');
```

### 即时操作方法

Midscene 提供了一些即时操作方法，如 `aiTap` `aiInput` `aiScroll` `aiHover` 等，它们也常用于自动化代码中。你可以在 [API](./api.mdx) 页面查看。


## 选用 `aiAct` 与结构化代码，哪个才是最优解？

没有标准答案。这取决于模型的能力、实际业务的复杂度。

一般来说，如果出现了以下现象，你应该考虑放弃 `aiAct` 方法：

- `aiAct` 在多次重放后，成功率不满足需求
- 反复调优 `aiAct` 的 prompt 已经让你感到疲惫、耗费了太多时间
- 需要对脚本进行单步调试

## 想要轻松编写结构化代码？

如果你觉得上述 javascript 代码很难写，那么现在是时候使用 AI IDE 了。

使用你的 AI IDE 索引我们的文档即可：

- https://midscenejs.com/use-javascript-to-optimize-ai-automation-code.md
- https://midscenejs.com/api.md

关于如何将 Midscene 文档添加到 AI IDE，请参考 [这篇文章](./llm-txt.mdx#usage)。



---
url: /zh/web-api-reference.md
---

# API 参考（Web）

当你需要自定义 Midscene 的浏览器自动化 Agent，或查阅 Web 专属构造参数时，请参考本篇。关于通用参数（报告、Hook、缓存等），请阅读[API 参考（通用）](./api)。

## Action Space（动作空间）

PuppeteerAgent、PlaywrightAgent 和 Chrome Bridge 共用一套 Action Space，Midscene Agent 在规划任务时可以使用这些操作：

- `Tap` —— 左键点击元素。
- `RightClick` —— 右键点击元素。
- `DoubleClick` —— 双击元素。
- `Hover` —— 悬停目标元素。
- `Input` —— 输入文本，支持 `replace`/`append`/`clear` 模式。
- `KeyboardPress` —— 按下指定键（可在按键前先聚焦目标）。
- `Scroll` —— 以元素为起点或从屏幕中央滚动，支持滚动到顶/底/左/右。
- `DragAndDrop` —— 从一个元素拖拽到另一个元素。
- `LongPress` —— 长按目标元素，可选自定义时长。
- `Swipe` —— 触摸式滑动（开启 `enableTouchEventsInActionSpace` 时可用）。
- `ClearInput` —— 清空输入框内容。
- `Navigate` —— 在当前标签页打开指定 URL。
- `Reload` —— 刷新当前页面。
- `GoBack` —— 浏览器后退。

## PuppeteerAgent {#puppeteer-agent}

当你需要在 Puppeteer 控制的浏览器里复用 Midscene 的 AI 操作能力时使用。

### 导入

```ts
import { PuppeteerAgent } from '@midscene/web/puppeteer';
```

### 构造器

```ts
const agent = new PuppeteerAgent(page, {
  // 浏览器特有配置...
});
```

### 浏览器特有选项

除了通用 Agent 参数，Puppeteer 还提供：

- `forceSameTabNavigation: boolean` —— 限制始终在当前标签页内导航，默认 `true`。
- `waitForNavigationTimeout: number` —— 当操作触发页面跳转时的最长等待时间，默认 `5000`（设为 `0` 表示不等待）。
- `waitForNetworkIdleTimeout: number` —— 每次操作后等待网络空闲的时间，默认 `2000`（设为 `0` 关闭）。
- `enableTouchEventsInActionSpace: boolean` —— 在动作空间里增加触摸手势（如滑动），用于需要触摸事件的页面，默认 `false`。
- `forceChromeSelectRendering: boolean` —— 强制 `select` 元素使用 Chrome 的 base-select 样式，避免系统原生样式导致截图/元素提取不可见；需要 Puppeteer > `24.6.0`。
- `customActions: DeviceAction[]` —— 借助 `defineAction` 注册自定义动作，让规划器可以调用领域特定步骤。

### 使用说明

:::info

- 每个页面一个 Agent：默认情况下（`forceSameTabNavigation: true`）Midscene 会拦截新标签并在当前页打开，便于调试；若想保留新标签行为可设为 `false`，并为每个标签创建新的 Agent。
- 更多交互方法请参考 [API 参考（通用）](./api#interaction-methods)。

:::

### 示例

#### 快速上手

```ts
import puppeteer from 'puppeteer';
import { PuppeteerAgent } from '@midscene/web/puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://www.ebay.com');

const agent = new PuppeteerAgent(page, {
  actionContext: 'When a cookie dialog appears, accept it.',
});

await agent.aiAct('search "Noise cancelling headphones" and open first result');
const items = await agent.aiQuery(
  '{itemTitle: string, price: number}[], list two products with price',
);
console.log(items);

await agent.aiAssert('there is a category filter on the left sidebar');
await browser.close();
```

#### 连接远程 Puppeteer 浏览器

```ts
import puppeteer from 'puppeteer';
import { PuppeteerAgent } from '@midscene/web/puppeteer';

const browser = await puppeteer.connect({
  browserWSEndpoint: process.env.REMOTE_CDP_URL!,
});

const [page = await browser.newPage()] = await browser.pages();
const agent = new PuppeteerAgent(page, {
  waitForNetworkIdleTimeout: 0,
});

await agent.aiAct('open https://example.com and click the login button');
await agent.destroy();
await browser.disconnect();
```

### 另请参阅

- [集成到 Puppeteer](./integrate-with-puppeteer) 获取安装、Fixture 与远程 CDP 配置。

## PlaywrightAgent {#playwright-agent}

在 Playwright 浏览器中使用 Midscene 以支持带 AI 的测试或自动化流程。

### 导入

```ts
import { PlaywrightAgent } from '@midscene/web/playwright';
```

### 构造器

```ts
const agent = new PlaywrightAgent(page, {
  // 浏览器特有配置...
});
```

### 浏览器特有选项

- `forceSameTabNavigation: boolean` —— 强制在当前标签页内执行，默认 `true`。
- `waitForNavigationTimeout: number` —— 等待导航完成的时间，默认 `5000`（设为 `0` 关闭）。
- `waitForNetworkIdleTimeout: number` —— 每次操作后等待网络空闲的时间，默认 `2000`（设为 `0` 关闭）。
- `enableTouchEventsInActionSpace: boolean` —— 在动作空间里增加触摸手势（如滑动），用于需要触摸事件的页面，默认 `false`。
- `forceChromeSelectRendering: boolean` —— 强制 `select` 元素使用 Chrome 的 base-select 样式，避免系统原生样式导致截图/元素提取不可见；需要 Playwright ≥ `1.52.0`。
- `customActions: DeviceAction[]` —— 追加项目特有的动作，供规划器调用。

### 使用说明

:::info

- 每个页面一个 Agent：默认 `forceSameTabNavigation` 为 `true`，Midscene 会拦截新标签确保稳定性；如需新标签请设为 `false` 并为每个标签创建新的 Agent。
- 更多交互方法请参考 [API 参考（通用）](./api#interaction-methods)。

:::

### 示例

#### 快速上手

```ts
import { chromium } from 'playwright';
import { PlaywrightAgent } from '@midscene/web/playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://www.ebay.com');

const agent = new PlaywrightAgent(page);
await agent.aiAct('search "Noise cancelling headphones" and wait for results');
await agent.aiWaitFor('the results grid becomes visible');

const price = await agent.aiNumber('price of the first headphone');
console.log('first price', price);

await agent.aiTap('click the first result card');
await browser.close();
```

#### 使用 Midscene fixture 扩展 Playwright 测试

```ts
// playwright.config.ts
export default defineConfig({
  reporter: [['list'], ['@midscene/web/playwright-reporter']],
});

// e2e/fixture.ts
import { test as base } from '@playwright/test';
import { PlaywrightAiFixture } from '@midscene/web/playwright';

export const test = base.extend(
  PlaywrightAiFixture({ waitForNetworkIdleTimeout: 1000 }),
);

// e2e/examples.spec.ts
test('search flow', async ({ agentForPage, page }) => {
  await page.goto('https://www.ebay.com');
  const agent = await agentForPage(page);
  await agent.aiAct('search "keyboard" and open first listing');
  await agent.aiAssert('a product detail page is opened');
});
```

### 另请参阅

- [集成到 Playwright](./integrate-with-playwright) 获取安装、Fixture 用法和更多配置。

## Chrome Bridge Agent {#chrome-bridge-agent}

Bridge Mode 允许 Midscene 通过扩展控制当前桌面 Chrome 标签页，而无需再启动独立的自动化浏览器。

### 导入

```ts
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';
```

### 构造器

```ts
const agent = new AgentOverChromeBridge({
  allowRemoteAccess: false,
  // 其他桥接配置...
});
```

### 桥接配置

- `closeNewTabsAfterDisconnect?: boolean` —— 是否在销毁时自动关闭桥接创建的新标签页，默认 `false`。
- `allowRemoteAccess?: boolean` —— 是否允许远程机器连接，默认 `false`（监听 `127.0.0.1`）。
- `host?: string` —— 自定义 Bridge Server 的监听地址，优先级高于 `allowRemoteAccess`。
- `port?: number` —— Bridge Server 端口，默认 `3766`。

完整安装与能力说明，见 [Chrome 插件桥接模式](./bridge-mode#constructor)。

### 使用说明

:::info

请先调用 `connectCurrentTab` 或 `connectNewTabWithUrl` 再执行其他操作。每个 `AgentOverChromeBridge` 只能连接一个标签页；`destroy` 之后需要重新创建实例。

:::

### 方法

#### `connectCurrentTab()`

```ts
function connectCurrentTab(options?: {
  forceSameTabNavigation?: boolean;
}): Promise<void>;
```

- `options.forceSameTabNavigation`（默认 `true`）会拦截新标签并在当前页打开，方便调试；若想保留新标签行为可设为 `false`，但需要为每个新标签创建新的 Agent。
- 连接当前激活标签页，成功后返回 `Promise<void>`，如果扩展未允许连接会报错。

#### `connectNewTabWithUrl()`

```ts
function connectNewTabWithUrl(
  url: string,
  options?: { forceSameTabNavigation?: boolean },
): Promise<void>;
```

- `url` —— 新标签页要打开的地址。
- `options` —— 与 `connectCurrentTab` 相同。
- 打开新标签并连接成功后返回 `Promise<void>`。

#### `destroy()`

```ts
function destroy(closeNewTabsAfterDisconnect?: boolean): Promise<void>;
```

- `closeNewTabsAfterDisconnect` —— 运行时覆盖构造器配置，为 `true` 时销毁时关闭桥接创建的新标签页。
- 清理桥接连接和本地服务完成后返回 `Promise<void>`。

### 示例

#### 打开新的桌面标签页

```ts
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';

const agent = new AgentOverChromeBridge();
await agent.connectNewTabWithUrl('https://www.bing.com');

await agent.ai('search "AI automation" and summarise first result');
await agent.aiAssert('some search results show up');
await agent.destroy();
```

#### 附着到当前标签页

```ts
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';

const agent = new AgentOverChromeBridge({
  allowRemoteAccess: false,
  closeNewTabsAfterDisconnect: true,
});

await agent.connectCurrentTab({ forceSameTabNavigation: true });
await agent.aiAct('open Gmail and report how many unread emails are visible');
await agent.destroy();
```

### 另请参阅

- [API 参考（通用）](./api#interaction-methods) 查看共享的 Agent 方法。
- [桥接模式](./bridge-mode) 了解扩展安装、执行顺序与 YAML 用法。

