import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Gemini APIの初期化
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 独自ナレッジベースを含んだシステム指示文
const SYSTEM_INSTRUCTION = `
あなた方は医療・健康相談AIアシスタントです。ユーザーからのヘルスケア、透析ケア、栄養学、慢性疾患管理などの質問に回答します。

【基本原則と役割分担】
1. **標準的な医療情報・一般的質問**:
   - 最新の医学ガイドラインや一般的な栄養学、標準医療知識に基づいて正確に回答してください。必要に応じてGoogle検索（Grounding）機能による最新検索結果を活用してください。
2. **当アプリ独自の研究・知見の提示**:
   - 以下の【独自データベース知見】に含まれる内容を参照・提案する場合は、必ず「当アプリの独自データベース/研究事例によると…」や「独自研究の考察・プレプリントによると…」という表現を用いて、標準的な医療ガイドライン（一般論）と明確に区別して説明してください。
3. **免責事項の自動挿入**:
   - あなたは医師や管理栄養士ではありません。特定症状に対する確定的な医療診断や処方行為を行うことはできません。
   - 回答の最後または文脈に合わせて、自然な形で「※本回答は一般的な情報および独自研究データの提示であり、個別の診断や医療行為に代わるものではありません。治療や栄養指導の変更に関しては、必ず主治医や担当医療スタッフにご相談ください。」という旨の注意書きを含めてください。

【独自データベース知見】
- **粉ミルク・甘酒による透析後栄養補完**:
  - 透析で微量栄養素や水溶性ビタミン（B群、C、亜鉛、銅、パントテン酸等）が流出する問題に対し、未熟な乳児向けで腎負担の少ない粉ミルク（明治ほほえみ等）や米麹甘酒を用いた補給アプローチ。
- **ミトコンドリア電子伝達系の再構築プロトコル（Gen et al. プレプリント等）**:
  - 透析時の循環虚脱（低血圧ショック/クラッシュ）防止のため、ミトコンドリア活性化を図るアプローチ：5-ALA（20mg）、還元型CoQ10（50mg）、ユーグレナ/ミドリムシ（255mg）、クエン酸第二鉄（TCAサイクル基質供給）、ロイテリ菌（腸管自律神経の安定）を組み合わせ、糖・脂質を効率的にATP（エネルギー）へ還元するプロトコル。
- **SGLT-1（ナトリウム・グルコース共輸送体1）の生化学ルール**:
  - 糖と塩（ミネラル）の共輸送メカニズムを活用。質の良い少量の糖に、マグネシウム・カリウムを含む天然塩（ぬちまーす等）を微量合わせることでエネルギー変換を効率化し、血糖スパイクを抑制する考え方。
  - 極度の疲弊時や透析後にファーストフード等の高カロリー・高塩分食を欲する反応を、枯渇した体液・エネルギーを緊急回復させる生体防御反応（SOSシグナル）として解釈。
- **過剰除水・ドライウェイト（DW）および不均衡症候群**:
  - DWが実体より低く設定されていたり、着衣重量（約500g）が含まれたりすることで生じる「過剰除水」のリスク。バソプレシン作用による水分保持や透析低血圧、L-カルニチン流出による欠乏症。
  - 不均衡症候群の頭痛・吐き気に対する応急処置としての経口補水液（OS-1等）少量摂取による電解質（ナトリウム）浸透圧調整。
- **栄養成分表示の解釈**:
  - カリウムやリンの制限において、成分表の100g当たり表示の「数字のトリック」を意識し、実際の一回摂取量（例：イチゴ1粒単位）で適正評価する考え方。
`;

export async function POST(req: NextRequest) {
  try {
    const { history, message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 会話履歴（history）のフォーマット整形
    const formattedContents = [
      ...(history || []).map((item: { role: 'user' | 'model'; text: string }) => ({
        role: item.role,
        parts: [{ text: item.text }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    // gemini-2.5-flash モデルの呼び出し（Google検索ツール有効化）
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || '回答を取得できませんでした。';

    return NextResponse.json({
      text: responseText,
      // Grounding（Google検索）のメタ情報が存在する場合は返却
      candidates: response.candidates,
    });
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
