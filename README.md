# AI PM Delivery Skills

这是一套面向产品交付的六 Skill 套件。它把一句话需求、会议记录、已有或 AI 生成的 PRD、原型和开发反馈，整理成可追溯、可恢复、开发可直接阅读的 Markdown 交付包。

普通用户从 `pm-delivery` 进入。它只初始化或读取 `START-HERE.md` 的当前状态卡，再路由到一个准确阶段；Definition、Experience 和 Handoff 分别由独立 Skill 执行。这样既支持较强 Agent 从普通入口自行路由，也支持人在弱模型会话中按状态卡明确续接。

## 六个 Skills

| Skill | 角色 |
| --- | --- |
| `pm-delivery` | 唯一普通入口；初始化 Delivery、恢复当前状态并路由，不执行阶段正文。 |
| `pm-definition` | 收敛范围、业务逻辑、决策与验收场景；完成后等待明确批准。 |
| `pm-experience` | 确定体验目标和 Brief，直接操作 Pen CLI，展示预览并冻结 Candidate。 |
| `pm-reverse-review` | 对 Candidate 或 Release 做独立、只读的反向审查。 |
| `pm-handoff` | 处理 Review 结论、交付确认、不可变 Release、发送与接收回执。 |
| `pm-brainstorm` | 可选专家；只比较一个已经记录的产品 Decision Node。 |

```text
pm-delivery（普通入口 / 恢复路由）
  → pm-definition
  → pm-experience
  → pm-reverse-review（推荐，可明确跳过）
  → pm-handoff
  → Release sent
  → receipt acknowledged
```

`pm-brainstorm` 只在 Definition 中确有多个实质产品方向时按需使用。开发实现、部署和生产上线不属于这条 PM 流程；这里的 Release 是交给开发的不可变内部快照，不表示已经上线。

## 安装

六个 Skills 是一个完整套件。推荐从仓库一次安装全部 Skills：

```bash
npx skills add <owner>/<repo> --skill '*'
```

将 `<owner>/<repo>` 替换为实际 GitHub 仓库。安装器询问作用域时，项目级安装只对当前项目生效，适合团队仓库；全局安装可供本机多个项目使用，适合个人通用环境。按宿主提示选择即可。

不要只安装 `pm-delivery`：它是薄路由，运行时会把工作交给另外五个同套件 Skills，并依赖同仓的 Template 和 Validator。只安装入口会得到不完整流程。仓库采用 skills.sh 可发现的平铺结构：

```text
skills/<skill-name>/SKILL.md
```

## 工作方式

每个 Delivery 的 `START-HERE.md` 顶部只有一张当前状态卡，记录 Phase、当前 gate、阻塞、允许/禁止动作、通过条件、`Next skill` 和下一责任人。详细产品事实、批准原话、Candidate manifest、Review Finding、发送证据与回执仍保存在各自权威 Markdown 中；聊天记录不是事实源。

用户需要在关键边界给出后续的明确批准：Definition 批准、具体 Experience Brief 范围/保真度批准、渲染预览批准、是否 Review、是否“交付给开发”，以及开发接收确认。普通的“继续”不会被解释为这些批准。

当范围存在用户可见变化且没有准确既有参考时，当前直接路线由 PM Agent 通过 Pen CLI 操作 `.pen`，完成检查、导出、回读并展示渲染预览。PM 只确认要覆盖的页面/状态和普通语言的精细程度，不需要选择命令、节点 ID 或技术实现。纯后台变化、准确既有参考、明确跳过或工具不可用时，可以记录原因与风险后继续。

## 可靠性边界

套件已用同一份 Skills 验证基础的跨 Agent/强弱模型兼容路径，但不承诺任意模型都能无人监督地遵守所有步骤。

Template 和只读 Validator 提供可观察的状态、五个转换前诊断以及恢复证据。Validator 只返回 PASS/FAIL，不写 Delivery、不替 Owner 批准，也不能拦截 Agent 直接调用 Pen、文件或发送工具。因此它是 advisory 诊断，不是不可绕过的 enforcement runtime。

本仓库不安装 Hook，也不依赖 Hook 强制阶段切换。若场景要求结构性阻止非法工具调用，需要另行设计 tool proxy、guarded runtime 或其他 enforcement 层，不能靠继续增加 Skill 提示词实现。

## 交付包概要

默认目录形状如下；小变更可压缩为一个 `delivery.md`，较大产品可拆成 Foundation 与 Active Slice：

```text
product-deliveries/<delivery-id>/
  START-HERE.md
  draft/
    delivery.md              # 或 foundation.md + slices/
    evidence/
    experience/
      brief.md
      prototype.pen
      previews/
      manifest.md
  reviews/
  releases/<release-id>/
    MANIFEST.md
  changes/
```

Markdown 是业务行为 authority；`.pen` 承载探索证据或正式视觉实现目标。旧 Release 不改写。已交付行为发生用户可观察变化时，先记录 Change Proposal，再开启新一轮 Definition 和 Release；纯实现反馈保留在 Engineering Questions。

## 安全与许可证

导入企业材料前，请确认组织批准的模型、宿主和连接器，并先脱敏敏感信息。Skills 不替组织判断供应商的数据保留政策，也不负责 Pen 账号、宿主认证、生产部署或专用 PM UI。

本项目采用 [MIT License](LICENSE)。
