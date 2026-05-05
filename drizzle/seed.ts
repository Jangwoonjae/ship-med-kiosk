import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL ?? 'file:./data/ship-med.db';

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const seedData = [
  // ── 주사약 (Injectables) ─────────────────────────────────────────────
  { category: '주사약', name_en: 'Lidocaine 1%', name_ko: '리도카인', brand_name: '휴온스리도카인염산염수화물주1%', form: 'vial', strength: '0.2g/20mL', indication: '국소마취', std_intl: 5, std_dom: 0, current_qty: 5 },
  { category: '주사약', name_en: 'Dexamethasone', name_ko: '덱사메타손', brand_name: '제일제약덱사메타손주사액', form: 'amp', strength: '5mg/1mL', indication: '중증 천식, 아나필락시스', std_intl: 5, std_dom: 0, current_qty: 5 },
  { category: '주사약', name_en: 'Epinephrine', name_ko: '에피네프린', brand_name: '에피네프린주0.1%', form: 'amp', strength: '1mg/1mL', indication: '아나필락시스, 심정지', std_intl: 5, std_dom: 2, current_qty: 5 },
  { category: '주사약', name_en: 'Atropine', name_ko: '아트로핀', brand_name: '황산아트로핀주사액', form: 'amp', strength: '0.5mg/1mL', indication: '서맥, 유기인계 중독', std_intl: 5, std_dom: 2, current_qty: 5 },
  { category: '주사약', name_en: 'Morphine', name_ko: '모르핀', brand_name: '황산모르핀주사액10mg', form: 'amp', strength: '10mg/1mL', indication: '심한 통증', std_intl: 5, std_dom: 0, current_qty: 5 },
  { category: '주사약', name_en: 'Diazepam', name_ko: '디아제팜', brand_name: '바리움주사액', form: 'amp', strength: '10mg/2mL', indication: '경련, 불안', std_intl: 5, std_dom: 0, current_qty: 5 },
  { category: '주사약', name_en: 'Furosemide', name_ko: '푸로세미드', brand_name: '라식스주사액', form: 'amp', strength: '20mg/2mL', indication: '폐부종, 급성 심부전', std_intl: 5, std_dom: 2, current_qty: 5 },
  { category: '주사약', name_en: 'Metoclopramide', name_ko: '메토클로프라미드', brand_name: '맥페란주사', form: 'amp', strength: '10mg/2mL', indication: '구토', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Hyoscine Butylbromide', name_ko: '히요스신부틸브로마이드', brand_name: '부스코판주사', form: 'amp', strength: '20mg/1mL', indication: '복통, 소화관 경련', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Promethazine', name_ko: '프로메타진', brand_name: '프로메타진염산염주', form: 'amp', strength: '25mg/1mL', indication: '멀미, 구토', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Tramadol', name_ko: '트라마돌', brand_name: '트리돌주100mg', form: 'amp', strength: '100mg/2mL', indication: '중등도 통증', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Ketorolac', name_ko: '케토로락', brand_name: '타라딘주사', form: 'amp', strength: '30mg/1mL', indication: '통증 (단기)', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Ondansetron', name_ko: '온단세트론', brand_name: '조프란주4mg', form: 'amp', strength: '4mg/2mL', indication: '구역·구토', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Hydrocortisone', name_ko: '하이드로코르티손', brand_name: '하이코티손주사100mg', form: 'vial', strength: '100mg', indication: '부신부전, 중증 알레르기', std_intl: 5, std_dom: 0, current_qty: 5 },
  { category: '주사약', name_en: 'Normal Saline 0.9%', name_ko: '생리식염주사액', brand_name: '생리식염주사액500mL', form: 'bag', strength: '0.9% 500mL', indication: '수액 보충', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Dextrose 5%', name_ko: '5%포도당주사액', brand_name: '5%포도당주사액500mL', form: 'bag', strength: '5% 500mL', indication: '수액 보충, 저혈당', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: "Ringer's Lactate", name_ko: '하트만주사액', brand_name: '하트만용액500mL', form: 'bag', strength: '500mL', indication: '전해질 보충', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Ampicillin', name_ko: '암피실린', brand_name: '암피실린나트륨주1g', form: 'vial', strength: '1g', indication: '세균 감염', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Gentamicin', name_ko: '겐타마이신', brand_name: '겐타마이신황산염주사80mg', form: 'amp', strength: '80mg/2mL', indication: '그람음성균 감염', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '주사약', name_en: 'Vitamin B Complex', name_ko: '비타민B복합제', brand_name: '비타민B복합주사', form: 'amp', strength: '2mL', indication: '비타민B 결핍', std_intl: 20, std_dom: 10, current_qty: 20 },
  // ── 내용약 (Oral Medicines) ──────────────────────────────────────────
  { category: '내용약', name_en: 'Dimenhydrinate', name_ko: '디메칠하이드리네이트', brand_name: '보나링에이정', form: 'tab', strength: '50mg', indication: '멀미, 구토', std_intl: 90, std_dom: 30, current_qty: 90 },
  { category: '내용약', name_en: 'Scopolamine', name_ko: '스코폴라민', brand_name: '키미테패치', form: 'patch', strength: '1.5mg', indication: '멀미 예방', std_intl: 30, std_dom: 10, current_qty: 30 },
  { category: '내용약', name_en: 'Acetaminophen', name_ko: '아세트아미노펜', brand_name: '타이레놀500mg', form: 'tab', strength: '500mg', indication: '해열, 진통', std_intl: 200, std_dom: 100, current_qty: 200 },
  { category: '내용약', name_en: 'Ibuprofen', name_ko: '이부프로펜', brand_name: '애드빌400mg', form: 'tab', strength: '400mg', indication: '진통, 소염', std_intl: 100, std_dom: 50, current_qty: 100 },
  { category: '내용약', name_en: 'Aspirin', name_ko: '아스피린', brand_name: '바이엘아스피린100mg', form: 'tab', strength: '100mg', indication: '해열, 진통, 항혈전', std_intl: 100, std_dom: 50, current_qty: 100 },
  { category: '내용약', name_en: 'Amoxicillin', name_ko: '아목시실린', brand_name: '아목시실린캡슐500mg', form: 'cap', strength: '500mg', indication: '세균 감염', std_intl: 60, std_dom: 30, current_qty: 60 },
  { category: '내용약', name_en: 'Ciprofloxacin', name_ko: '시프로플록사신', brand_name: '씨프로정500mg', form: 'tab', strength: '500mg', indication: '세균 감염 (광범위)', std_intl: 40, std_dom: 20, current_qty: 40 },
  { category: '내용약', name_en: 'Metronidazole', name_ko: '메트로니다졸', brand_name: '후라시닐정250mg', form: 'tab', strength: '250mg', indication: '혐기성균·기생충 감염', std_intl: 40, std_dom: 20, current_qty: 40 },
  { category: '내용약', name_en: 'Omeprazole', name_ko: '오메프라졸', brand_name: '오메프라졸캡슐20mg', form: 'cap', strength: '20mg', indication: '위궤양, 역류성 식도염', std_intl: 60, std_dom: 30, current_qty: 60 },
  { category: '내용약', name_en: 'Ranitidine', name_ko: '라니티딘', brand_name: '잔탁정150mg', form: 'tab', strength: '150mg', indication: '소화성 궤양, 속쓰림', std_intl: 60, std_dom: 30, current_qty: 60 },
  { category: '내용약', name_en: 'Loperamide', name_ko: '로페라미드', brand_name: '이모튬캡슐2mg', form: 'cap', strength: '2mg', indication: '설사', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Bisacodyl', name_ko: '비사코딜', brand_name: '둘코락스장용정5mg', form: 'tab', strength: '5mg', indication: '변비', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Cetirizine', name_ko: '세티리진', brand_name: '지르텍정10mg', form: 'tab', strength: '10mg', indication: '알레르기 비염, 두드러기', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Loratadine', name_ko: '로라타딘', brand_name: '클라리틴정10mg', form: 'tab', strength: '10mg', indication: '알레르기 비염', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Prednisolone', name_ko: '프레드니솔론', brand_name: '프레드니솔론정5mg', form: 'tab', strength: '5mg', indication: '염증, 알레르기', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Atorvastatin', name_ko: '아토르바스타틴', brand_name: '리피토정20mg', form: 'tab', strength: '20mg', indication: '고지혈증', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Amlodipine', name_ko: '암로디핀', brand_name: '노바스크정5mg', form: 'tab', strength: '5mg', indication: '고혈압, 협심증', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Nifedipine', name_ko: '니페디핀', brand_name: '아달라트캡슐10mg', form: 'cap', strength: '10mg', indication: '고혈압 응급', std_intl: 20, std_dom: 10, current_qty: 20 },
  { category: '내용약', name_en: 'Nitroglycerin', name_ko: '니트로글리세린', brand_name: '니트로글리세린설하정0.4mg', form: 'tab', strength: '0.4mg', indication: '협심증 발작', std_intl: 30, std_dom: 10, current_qty: 30 },
  { category: '내용약', name_en: 'Tramadol', name_ko: '트라마돌', brand_name: '트리돌캡슐50mg', form: 'cap', strength: '50mg', indication: '중등도 통증', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Codeine + Paracetamol', name_ko: '코데인+파라세타몰', brand_name: '코대원포르테정', form: 'tab', strength: '20mg/500mg', indication: '기침, 통증', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Dextromethorphan', name_ko: '덱스트로메토르판', brand_name: '메디폼정15mg', form: 'tab', strength: '15mg', indication: '기침', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Salbutamol', name_ko: '살부타몰', brand_name: '벤토린정2mg', form: 'tab', strength: '2mg', indication: '기관지 천식', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Theophylline', name_ko: '테오필린', brand_name: '서스테이드캡슐100mg', form: 'cap', strength: '100mg', indication: '천식, COPD', std_intl: 30, std_dom: 15, current_qty: 30 },
  { category: '내용약', name_en: 'Vitamin C', name_ko: '비타민C', brand_name: '고려은단비타민C1000mg', form: 'tab', strength: '1000mg', indication: '비타민C 보충', std_intl: 100, std_dom: 50, current_qty: 100 },
  { category: '내용약', name_en: 'Vitamin B1 (Thiamine)', name_ko: '티아민(비타민B1)', brand_name: '아리비타민B1정100mg', form: 'tab', strength: '100mg', indication: '비타민B1 결핍', std_intl: 60, std_dom: 30, current_qty: 60 },
  { category: '내용약', name_en: 'Oral Rehydration Salts', name_ko: '경구수분보충액', brand_name: '경구수분보충염', form: 'sachet', strength: '27.9g/L', indication: '탈수 보충', std_intl: 20, std_dom: 10, current_qty: 20 },
  // ── 외용약 (Topical/External Medicines) ─────────────────────────────
  { category: '외용약', name_en: 'Povidone-Iodine Solution', name_ko: '포비돈요오드액', brand_name: '베타딘액10%', form: 'solution', strength: '10% 100mL', indication: '상처 소독', std_intl: 5, std_dom: 3, current_qty: 5 },
  { category: '외용약', name_en: 'Povidone-Iodine Ointment', name_ko: '포비돈요오드연고', brand_name: '베타딘연고10%', form: 'ointment', strength: '10% 30g', indication: '상처 소독', std_intl: 5, std_dom: 3, current_qty: 5 },
  { category: '외용약', name_en: 'Silver Sulfadiazine', name_ko: '설파디아진은', brand_name: '실마진크림1%', form: 'cream', strength: '1% 50g', indication: '화상', std_intl: 5, std_dom: 2, current_qty: 5 },
  { category: '외용약', name_en: 'Hydrocortisone Cream', name_ko: '하이드로코르티손크림', brand_name: '하이드로코르티손크림1%', form: 'cream', strength: '1% 30g', indication: '피부 염증, 가려움', std_intl: 5, std_dom: 3, current_qty: 5 },
  { category: '외용약', name_en: 'Clotrimazole Cream', name_ko: '클로트리마졸크림', brand_name: '카네스텐크림1%', form: 'cream', strength: '1% 20g', indication: '진균 감염', std_intl: 3, std_dom: 2, current_qty: 3 },
  { category: '외용약', name_en: 'Mupirocin Ointment', name_ko: '무피로신연고', brand_name: '박트로반연고2%', form: 'ointment', strength: '2% 15g', indication: '피부 세균 감염', std_intl: 3, std_dom: 2, current_qty: 3 },
  { category: '외용약', name_en: 'Lidocaine Gel', name_ko: '리도카인젤', brand_name: '리도카인염산염젤2%', form: 'gel', strength: '2% 30g', indication: '도뇨관 삽입, 점막 마취', std_intl: 3, std_dom: 1, current_qty: 3 },
  { category: '외용약', name_en: 'Eye Drops (Chloramphenicol)', name_ko: '클로람페니콜점안액', brand_name: '클로람페니콜점안액0.5%', form: 'eyedrops', strength: '0.5% 10mL', indication: '결막염', std_intl: 3, std_dom: 2, current_qty: 3 },
  { category: '외용약', name_en: 'Ear Drops (Ciprofloxacin)', name_ko: '시프로플록사신점이액', brand_name: '씨프로플록사신점이액0.3%', form: 'eardrops', strength: '0.3% 5mL', indication: '외이염', std_intl: 3, std_dom: 2, current_qty: 3 },
  { category: '외용약', name_en: 'Nasal Spray (Xylometazoline)', name_ko: '자일로메타졸린비강분무액', brand_name: '오트리빈나잘스프레이', form: 'spray', strength: '0.1% 10mL', indication: '코막힘', std_intl: 3, std_dom: 2, current_qty: 3 },
  { category: '외용약', name_en: 'Salbutamol Inhaler', name_ko: '살부타몰흡입제', brand_name: '벤토린에보할러100mcg', form: 'inhaler', strength: '100mcg/dose', indication: '기관지 천식 발작', std_intl: 3, std_dom: 2, current_qty: 3 },
  { category: '외용약', name_en: 'Elastic Bandage', name_ko: '탄력붕대', brand_name: '탄력붕대10cm', form: 'bandage', strength: '10cm×4.5m', indication: '염좌, 압박', std_intl: 10, std_dom: 5, current_qty: 10 },
  { category: '외용약', name_en: 'Triangular Bandage', name_ko: '삼각붕대', brand_name: '삼각붕대', form: 'bandage', strength: '90×90×127cm', indication: '골절, 탈구 고정', std_intl: 5, std_dom: 3, current_qty: 5 },
];

  await client.batch(
    seedData.map(item => ({
      sql: `INSERT OR IGNORE INTO medicines (category, name_en, name_ko, brand_name, form, strength, indication, std_intl, std_dom, current_qty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [item.category, item.name_en, item.name_ko, item.brand_name, item.form, item.strength, item.indication, item.std_intl, item.std_dom, item.current_qty],
    })),
    'write'
  );

  client.close();
  console.log(`Seeded ${seedData.length} medicines.`);
}

main();
