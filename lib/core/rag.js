/**
 * rag.js — 纯函数 TF-IDF 检索引擎
 *
 * 零依赖，纯 JS。适用于中文和英文文本。
 * 在调用前由外部负责读取文件内容。
 */

/** 中文/英文分词（简单按字符和空格拆分） */
function tokenize(text) {
  const normalized = text.toLowerCase();
  // 中文：按单字拆分；英文：按空格/Punctuation 拆分
  const tokens = [];
  // 匹配中文字符或英文单词
  const regex = /[\u4e00-\u9fff]|[a-z]+/g;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

/** 构建倒排索引 */
export function buildIndex(docs) {
  const df = {};   // document frequency: term → count of docs containing it
  const tf = {};   // term frequency: docIdx → { term → count }
  const docLengths = [];

  for (let i = 0; i < docs.length; i++) {
    const terms = tokenize(docs[i].content || "");
    const termCounts = {};
    const seen = new Set();

    for (const term of terms) {
      termCounts[term] = (termCounts[term] || 0) + 1;
      if (!seen.has(term)) {
        df[term] = (df[term] || 0) + 1;
        seen.add(term);
      }
    }

    tf[i] = termCounts;
    docLengths.push(terms.length || 1);
  }

  return { df, tf, docLengths, N: docs.length, docs };
}

/** 计算单个 term 的 TF-IDF 权重 */
function termWeight(term, docIdx, index) {
  const { tf, df, docLengths, N } = index;
  const termFreq = tf[docIdx]?.[term] || 0;
  if (termFreq === 0) return 0;

  // TF: log normalization
  const tfi = 1 + Math.log(termFreq);
  // IDF: inverse document frequency with smoothing
  const idf = Math.log((N + 1) / (df[term] + 1)) + 1;

  return tfi * idf;
}

/** 检索：返回按 TF-IDF 分数排序的前 topK 个文档 */
export function search(query, index, topK = 3) {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0 || index.N === 0) return [];

  // 对每个文档计算分数
  const scores = [];
  for (let i = 0; i < index.N; i++) {
    let score = 0;
    for (const term of queryTerms) {
      score += termWeight(term, i, index);
    }
    // 归一化到文档长度
    score = score / index.docLengths[i];
    if (score > 0) {
      scores.push({ idx: i, score, doc: index.docs[i] });
    }
  }

  // 按分数降序排列，取 topK
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

/** 便捷函数：给定文档列表和查询，返回相关文档内容 */
export function retrieve(docs, query, topK = 3) {
  if (docs.length === 0) return [];
  const index = buildIndex(docs);
  const results = search(query, index, topK);
  return results.map(r => ({
    path: r.doc.path,
    score: r.score,
    content: r.doc.content,
  }));
}
