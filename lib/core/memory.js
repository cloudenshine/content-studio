/**
 * memory.js — 用户偏好记忆 + 经验总结模块
 *
 * 三层功能：
 * 1. 用户偏好笔记注入（引用 vault 笔记）
 * 2. 自动纠偏：将失败检查格式化为修订指令
 * 3. 经验总结：记录反复出现的问题
 */

/** 将笔记内容列表格式化为 prompt 注入段落 */
export function formatMemoryNotes(notes) {
  if (!notes || notes.length === 0) return "";

  const parts = ["# 用户创作偏好\n"];
  parts.push("以下内容来自用户的偏好笔记，请在创作中遵循：\n");

  for (const note of notes) {
    if (note.content && note.content.trim()) {
      parts.push(`---\n> **${note.label || note.path}**\n`);
      parts.push(note.content.trim());
      parts.push("");
    }
  }

  return parts.join("\n");
}

/** 将失败的 P0 检查格式化为修订指令 */
export function formatRevisionInstruction(failedChecks) {
  if (!failedChecks || failedChecks.length === 0) return "";

  const parts = ["# 修订要求\n"];
  parts.push("以下问题需要在修订中修复：\n");

  const checkDescriptions = {
    character_choice_has_cost: "角色的选择缺乏代价——每个重要选择需要伴随失去、牺牲或后果",
    plot_driven_by_causality: "情节推进缺乏因果逻辑——用「因为所以」链条驱动而不是巧合",
    no_resurrection_without_cost: "复活或反转缺乏相应代价——让读者觉得是编的不是挣的",
    foreshadowing_has_payoff: "伏笔需要有对应的兑现时刻——埋了就要收",
    dialogue_is_subtext: "对白太直白——角色嘴上说十分心里想十分只能说出三分",
    stage_direction_is_visual: "舞台指示写入了不可见的内容——只写能看到的",
    value_proposition_clear: "价值主张不清晰——读者看完不知道这跟他有什么关系",
    no_vague_claims: "避免空洞商业术语——用具体替代抽象",
    data_supports_claim: "结论缺乏数据支撑——每个结论背后应该有证据",
    message_before_data: "先给结论再给数据——不要用数据开头让读者猜结论",
    hook_present: "开头缺乏钩子——第一段没有给读者继续读的理由",
    age_appropriate_language: "语言难度不匹配目标年龄段——检查用词是否过难",
    example_provided: "概念缺乏例子——每个抽象概念需要具体例证",
    data_or_evidence: "缺少数据或证据——用具体数字代替模糊说法",
    key_message_clear: "核心信息不突出——读者应该能用一句话说出你讲了什么",
  };

  for (const check of failedChecks) {
    const desc = checkDescriptions[check] || `未通过检查: ${check}`;
    parts.push(`- ${desc}`);
  }

  parts.push("\n请以上述问题为导向重新生成，保持原文核心内容不变但修复这些问题。");
  return parts.join("\n");
}

/** 从失败检查中提取已知问题描述 */
export function extractKnownProblems(failedChecks) {
  const problemLabels = {
    character_choice_has_cost: "角色的选择缺乏代价",
    plot_driven_by_causality: "情节推进因果链不足",
    no_resurrection_without_cost: "反转/复活缺乏代价",
    foreshadowing_has_payoff: "伏笔未兑现",
    dialogue_is_subtext: "对白太直白缺乏潜台词",
    stage_direction_is_visual: "舞台指示包含不可见内容",
    value_proposition_clear: "价值主张不清晰",
    no_vague_claims: "使用了空洞商业术语",
    data_supports_claim: "结论缺乏数据支撑",
    message_before_data: "信息组织方式错误（数据先于结论）",
    hook_present: "开头缺乏钩子",
  };

  return failedChecks
    .filter(c => problemLabels[c])
    .map(c => problemLabels[c]);
}

/** 将已知问题追加到记忆笔记 */
export function formatKnownProblemsSection(problems) {
  if (!problems || problems.length === 0) return "";

  const parts = [
    "\n\n## 已知问题（自动记录）\n",
    "以下问题是系统在多次生成中发现的常见问题，请在创作时注意：\n"
  ];

  for (const problem of problems) {
    parts.push(`- [ ] ${problem}`);
  }

  return parts.join("\n");
}
