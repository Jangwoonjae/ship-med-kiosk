const OLLAMA_HOST  = process.env.OLLAMA_HOST  ?? 'localhost';
const OLLAMA_PORT  = process.env.OLLAMA_PORT  ?? '11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma3:12b';
const OLLAMA_URL   = `http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/generate`;

export async function matchIngredient(
  productName: string,
  ingredientList: string[]
): Promise<string | null> {
  if (!productName || ingredientList.length === 0) return null;

  const prompt = `당신은 한국 의약품 전문가입니다.
아래 의약품 품명을 보고 주성분이 무엇인지 파악한 후
성분명 목록에서 가장 일치하는 것 하나만 답하세요.

규칙:
- 반드시 아래 목록에 있는 성분명 그대로만 답하세요
- 목록에 없으면 "없음" 이라고만 답하세요
- 복합제인 경우 주성분(함량이 가장 많은 것)으로 판단하세요
- 다른 설명 없이 성분명만 답하세요

예시:
- "타이레놀정" → 아세트아미노펜
- "모드코프에스연질캡슐" → 아세트아미노펜 (주성분)
- "부루펜정" → 이부프로펜
- "베타딘액" → 포비돈요오드액

의약품 품명: ${productName}

성분명 목록:
${ingredientList.join('\n')}

답:`;

  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 30,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const answer = data.response?.trim() ?? '';

    const matched = ingredientList.find(ing =>
      answer.includes(ing) || ing.includes(answer)
    );

    return matched ?? null;

  } catch (error) {
    console.error('Ollama 연결 오류:', error);
    return null;
  }
}
