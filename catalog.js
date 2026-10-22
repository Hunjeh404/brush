// Each collectible uses its own generated illustration; prices do not change old purchases.
export const WORLDS = [
  {
    "id": "garden",
    "name": "올림포스 정원",
    "file": "olympus-garden.webp",
    "cost": 0,
    "description": "처음 모험을 시작한 꽃과 분수의 정원."
  },
  {
    "id": "sea",
    "name": "포세이돈의 바다 궁전",
    "file": "worlds/sea.webp",
    "cost": 160,
    "description": "산호와 진주가 빛나는 바닷속 쉼터."
  },
  {
    "id": "moon",
    "name": "아르테미스의 달빛 숲",
    "file": "worlds/moon.webp",
    "cost": 200,
    "description": "은빛 나무 사이로 달이 떠오르는 숲."
  },
  {
    "id": "sun",
    "name": "아폴론의 태양 신전",
    "file": "worlds/sun.webp",
    "cost": 240,
    "description": "황금빛 햇살과 음악이 머무는 신전."
  },
  {
    "id": "wisdom",
    "name": "아테나의 지혜 도서관",
    "file": "worlds/wisdom.webp",
    "cost": 280,
    "description": "책과 별자리로 가득한 지혜의 방."
  },
  {
    "id": "harvest",
    "name": "데메테르의 꽃 들판",
    "file": "worlds/harvest.webp",
    "cost": 180,
    "description": "꽃과 과일이 무르익는 풍요의 들판."
  },
  {
    "id": "forge",
    "name": "헤파이스토스의 보석 공방",
    "file": "worlds/forge.webp",
    "cost": 320,
    "description": "작은 기적을 만드는 보석 공방."
  },
  {
    "id": "cloud",
    "name": "헤르메스의 구름 항구",
    "file": "worlds/cloud.webp",
    "cost": 120,
    "description": "구름 사이로 새로운 여행을 떠나는 항구."
  },
  {
    "id": "stars",
    "name": "별빛 천상 궁전",
    "file": "worlds/stars.webp",
    "cost": 400,
    "description": "은하수 위에서 별을 모으는 궁전."
  }
];
export const EXTRA_ITEMS = [
  {
    "id": "sea-1",
    "name": "산호 삼지창",
    "file": "treasures/sea-1.webp",
    "cost": 40,
    "kind": "garden",
    "theme": "sea"
  },
  {
    "id": "sea-2",
    "name": "조개 분수",
    "file": "treasures/sea-2.webp",
    "cost": 70,
    "kind": "garden",
    "theme": "sea"
  },
  {
    "id": "sea-3",
    "name": "돌고래 조각",
    "file": "treasures/sea-3.webp",
    "cost": 100,
    "kind": "garden",
    "theme": "sea"
  },
  {
    "id": "sea-4",
    "name": "진주 보물함",
    "file": "treasures/sea-4.webp",
    "cost": 140,
    "kind": "garden",
    "theme": "sea"
  },
  {
    "id": "sea-5",
    "name": "산호 화병",
    "file": "treasures/sea-5.webp",
    "cost": 180,
    "kind": "garden",
    "theme": "sea"
  },
  {
    "id": "sea-6",
    "name": "바다의 벽화",
    "file": "treasures/sea-6.webp",
    "cost": 220,
    "kind": "mural",
    "theme": "sea"
  },
  {
    "id": "moon-1",
    "name": "은빛 활",
    "file": "treasures/moon-1.webp",
    "cost": 40,
    "kind": "garden",
    "theme": "moon"
  },
  {
    "id": "moon-2",
    "name": "달빛 사슴",
    "file": "treasures/moon-2.webp",
    "cost": 70,
    "kind": "garden",
    "theme": "moon"
  },
  {
    "id": "moon-3",
    "name": "초승달 나무",
    "file": "treasures/moon-3.webp",
    "cost": 100,
    "kind": "garden",
    "theme": "moon"
  },
  {
    "id": "moon-4",
    "name": "별꽃 화분",
    "file": "treasures/moon-4.webp",
    "cost": 140,
    "kind": "garden",
    "theme": "moon"
  },
  {
    "id": "moon-5",
    "name": "숲속 등불",
    "file": "treasures/moon-5.webp",
    "cost": 180,
    "kind": "garden",
    "theme": "moon"
  },
  {
    "id": "moon-6",
    "name": "달의 벽화",
    "file": "treasures/moon-6.webp",
    "cost": 220,
    "kind": "mural",
    "theme": "moon"
  },
  {
    "id": "sun-1",
    "name": "태양의 리라",
    "file": "treasures/sun-1.webp",
    "cost": 40,
    "kind": "garden",
    "theme": "sun"
  },
  {
    "id": "sun-2",
    "name": "월계관 받침",
    "file": "treasures/sun-2.webp",
    "cost": 70,
    "kind": "garden",
    "theme": "sun"
  },
  {
    "id": "sun-3",
    "name": "황금 백조",
    "file": "treasures/sun-3.webp",
    "cost": 100,
    "kind": "garden",
    "theme": "sun"
  },
  {
    "id": "sun-4",
    "name": "햇살 오르간",
    "file": "treasures/sun-4.webp",
    "cost": 140,
    "kind": "garden",
    "theme": "sun"
  },
  {
    "id": "sun-5",
    "name": "호박빛 등잔",
    "file": "treasures/sun-5.webp",
    "cost": 180,
    "kind": "garden",
    "theme": "sun"
  },
  {
    "id": "sun-6",
    "name": "태양의 벽화",
    "file": "treasures/sun-6.webp",
    "cost": 220,
    "kind": "mural",
    "theme": "sun"
  },
  {
    "id": "wisdom-1",
    "name": "지혜의 부엉이",
    "file": "treasures/wisdom-1.webp",
    "cost": 40,
    "kind": "garden",
    "theme": "wisdom"
  },
  {
    "id": "wisdom-2",
    "name": "두루마리 함",
    "file": "treasures/wisdom-2.webp",
    "cost": 70,
    "kind": "garden",
    "theme": "wisdom"
  },
  {
    "id": "wisdom-3",
    "name": "작은 책장",
    "file": "treasures/wisdom-3.webp",
    "cost": 100,
    "kind": "garden",
    "theme": "wisdom"
  },
  {
    "id": "wisdom-4",
    "name": "천구의",
    "file": "treasures/wisdom-4.webp",
    "cost": 140,
    "kind": "garden",
    "theme": "wisdom"
  },
  {
    "id": "wisdom-5",
    "name": "올리브 등잔",
    "file": "treasures/wisdom-5.webp",
    "cost": 180,
    "kind": "garden",
    "theme": "wisdom"
  },
  {
    "id": "wisdom-6",
    "name": "지혜의 벽화",
    "file": "treasures/wisdom-6.webp",
    "cost": 220,
    "kind": "mural",
    "theme": "wisdom"
  },
  {
    "id": "harvest-1",
    "name": "황금 밀 바구니",
    "file": "treasures/harvest-1.webp",
    "cost": 40,
    "kind": "garden",
    "theme": "harvest"
  },
  {
    "id": "harvest-2",
    "name": "꽃수레",
    "file": "treasures/harvest-2.webp",
    "cost": 70,
    "kind": "garden",
    "theme": "harvest"
  },
  {
    "id": "harvest-3",
    "name": "석류나무",
    "file": "treasures/harvest-3.webp",
    "cost": 100,
    "kind": "garden",
    "theme": "harvest"
  },
  {
    "id": "harvest-4",
    "name": "풍요의 뿔",
    "file": "treasures/harvest-4.webp",
    "cost": 140,
    "kind": "garden",
    "theme": "harvest"
  },
  {
    "id": "harvest-5",
    "name": "나비 분수",
    "file": "treasures/harvest-5.webp",
    "cost": 180,
    "kind": "garden",
    "theme": "harvest"
  },
  {
    "id": "harvest-6",
    "name": "풍요의 벽화",
    "file": "treasures/harvest-6.webp",
    "cost": 220,
    "kind": "mural",
    "theme": "harvest"
  },
  {
    "id": "forge-1",
    "name": "청동 모루",
    "file": "treasures/forge-1.webp",
    "cost": 40,
    "kind": "garden",
    "theme": "forge"
  },
  {
    "id": "forge-2",
    "name": "황금 자동인형",
    "file": "treasures/forge-2.webp",
    "cost": 70,
    "kind": "garden",
    "theme": "forge"
  },
  {
    "id": "forge-3",
    "name": "보석 화로",
    "file": "treasures/forge-3.webp",
    "cost": 100,
    "kind": "garden",
    "theme": "forge"
  },
  {
    "id": "forge-4",
    "name": "수정 망치",
    "file": "treasures/forge-4.webp",
    "cost": 140,
    "kind": "garden",
    "theme": "forge"
  },
  {
    "id": "forge-5",
    "name": "태엽 부엉이",
    "file": "treasures/forge-5.webp",
    "cost": 180,
    "kind": "garden",
    "theme": "forge"
  },
  {
    "id": "forge-6",
    "name": "불꽃의 벽화",
    "file": "treasures/forge-6.webp",
    "cost": 220,
    "kind": "mural",
    "theme": "forge"
  },
  {
    "id": "cloud-1",
    "name": "날개 신발",
    "file": "treasures/cloud-1.webp",
    "cost": 40,
    "kind": "garden",
    "theme": "cloud"
  },
  {
    "id": "cloud-2",
    "name": "여행자의 가방",
    "file": "treasures/cloud-2.webp",
    "cost": 70,
    "kind": "garden",
    "theme": "cloud"
  },
  {
    "id": "cloud-3",
    "name": "구름 표지석",
    "file": "treasures/cloud-3.webp",
    "cost": 100,
    "kind": "garden",
    "theme": "cloud"
  },
  {
    "id": "cloud-4",
    "name": "날개 우편함",
    "file": "treasures/cloud-4.webp",
    "cost": 140,
    "kind": "garden",
    "theme": "cloud"
  },
  {
    "id": "cloud-5",
    "name": "하늘 나침반",
    "file": "treasures/cloud-5.webp",
    "cost": 180,
    "kind": "garden",
    "theme": "cloud"
  },
  {
    "id": "cloud-6",
    "name": "여행의 벽화",
    "file": "treasures/cloud-6.webp",
    "cost": 220,
    "kind": "mural",
    "theme": "cloud"
  },
  {
    "id": "stars-1",
    "name": "별자리 지구본",
    "file": "treasures/stars-1.webp",
    "cost": 40,
    "kind": "garden",
    "theme": "stars"
  },
  {
    "id": "stars-2",
    "name": "천마 조각",
    "file": "treasures/stars-2.webp",
    "cost": 70,
    "kind": "garden",
    "theme": "stars"
  },
  {
    "id": "stars-3",
    "name": "은하수 등불",
    "file": "treasures/stars-3.webp",
    "cost": 100,
    "kind": "garden",
    "theme": "stars"
  },
  {
    "id": "stars-4",
    "name": "별빛 수정",
    "file": "treasures/stars-4.webp",
    "cost": 140,
    "kind": "garden",
    "theme": "stars"
  },
  {
    "id": "stars-5",
    "name": "초승달 의자",
    "file": "treasures/stars-5.webp",
    "cost": 180,
    "kind": "garden",
    "theme": "stars"
  },
  {
    "id": "stars-6",
    "name": "은하수 벽화",
    "file": "treasures/stars-6.webp",
    "cost": 220,
    "kind": "mural",
    "theme": "stars"
  }
];
export const SLOTS = ['left','center','right','frontLeft','frontCenter','frontRight'];
export const SLOT_NAMES = {left:'왼쪽 받침대',center:'가운데 벽화',right:'오른쪽 받침대',frontLeft:'앞쪽 왼편',frontCenter:'앞쪽 가운데',frontRight:'앞쪽 오른편'};
