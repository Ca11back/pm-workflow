# Pen design input and Brief coverage worksheet

Copy this worksheet to `draft/experience/design-input-plan.md`. It is planning evidence, not the mutation payload. The runner receives only the separate UTF-8 `prototype-design.txt` file.

## Approved source binding

- Approved Brief：`draft/experience/brief.md`
- Brief SHA-256：{current approved hash}
- Design input：`draft/experience/prototype-design.txt`
- Design-input SHA-256：{hash after the coverage check below}

## Required page/state coverage

Create exactly one row for every page/state named in the approved Brief. Copy its approval-bound Coverage ID and short runtime relationship statement unchanged. Do not merge an empty, loading, error, recovery, permission, or success state into another row merely because it shares a page, and do not invent a relationship missing from the approved Brief.

| Coverage ID | Brief page/state | Markdown locator | Runtime relationship | Planned Pen node name | Full operations used | Visible proof in preview |
| --- | --- | --- | --- | --- | --- | --- |
| `PAGE-01-NORMAL` | {page / normal} | `{locator}` | {approved relationship statement} | `Coverage:PAGE-01-NORMAL` | `Insert`, `Update` | {what must be visible} |
| `PAGE-01-EMPTY` | {page / empty} | `{locator}` | {approved relationship statement} | `Coverage:PAGE-01-EMPTY` | `Insert`, `Update` | {what must be visible} |

Before running Pen, verify that every approved Brief page/state appears once, every Coverage ID and relationship value matches the Brief exactly, every relationship has an approved Markdown locator, and every Coverage ID appears in a visible node name in the design input. Record any intentionally absent or undefined state relationship as a Brief correction; do not silently omit or decide it.

## Canonical new-document shape

Use only the live-help-backed full operation names `Insert`, `Update`, and `Delete`. A captured variable or a unique display-name string may identify a parent. The new-document template normally needs `Insert` plus final `Update`; use `Delete` only when the approved design intentionally removes a node.

The actual `prototype-design.txt` contains only visible DSL, with no Markdown fence, comments, `batch_design(...)` wrapper, state/read/save calls, or transcript. Adapt the visible content and coverage IDs to the approved Brief:

```text
normal=Insert(document,{type:"frame",name:"Coverage:PAGE-01-NORMAL",x:0,y:0,width:480,height:320,layout:"vertical",padding:32,gap:16,fill:"#FFFFFF",clip:true,placeholder:true}); Insert("Coverage:PAGE-01-NORMAL",{type:"text",name:"Normal title",fontFamily:"Inter",fontSize:28,fontWeight:"700",fill:"#1A1A1A",content:"Approved normal state"}); Update(normal,{placeholder:false}); empty=Insert(document,{type:"frame",name:"Coverage:PAGE-01-EMPTY",x:520,y:0,width:480,height:320,layout:"vertical",padding:32,gap:16,fill:"#FFFFFF",clip:true,placeholder:true}); Insert(empty,{type:"text",name:"Empty message",fontFamily:"Inter",fontSize:18,fill:"#4A4A4A",content:"Approved empty state"}); Update(empty,{placeholder:false})
```

This template is a coverage aid, not product authority. Evidence-canvas layout does not define runtime behavior; use the approved relationship statement when interpreting multiple frames. Preview approval and later Review still decide whether the adapted design matches the approved Brief and Markdown behavior.
