# 기존 자산 사용 내역

사용자가 소유·관리하는 아래 저장소의 일러스트 재사용 지시에 따라 가져왔습니다. 다른 원본 저장소는 수정하거나 푸시하지 않았습니다.

- https://github.com/Hunjeh404/sudoku — 기준 커밋 `c40b61543617639d32273fe316f1f19dd7c53540`
  - `public/assets/portraits/{athena,ariadne,poseidon,cronus,hermes,artemis,demeter}.webp`
  - `public/assets/treasure/{olive_tree,lyre,ariadne_thread,mirror_shield}.webp`
  - `public/assets/ui/{plaque,puzzle_bg,coin_gold,favicon}.webp`
- https://github.com/Hunjeh404/greek-myth-map — 기준 커밋 `286dfbce4bef3a9d4ca09ae6b61956043d792451`
  - `images/ui/header.png`

위 파일은 `assets/`에 원본 바이트를 복사했습니다. 앱 설치용 PNG 아이콘 두 개는 기존 favicon의 규격 변환본입니다. 신전·정원은 새로 제작한 완성 일러스트 `assets/olympus-garden.webp`를 사용하며 기존 투명 보물 이미지를 그림 속 받침대에 겹칩니다. 치아 안내와 손상 균열은 SVG입니다. 기존 쿼터뷰 가구·바닥 타일은 사용하지 않았습니다.

이 앱을 제3자에게 공개 배포할 때 원본 아트의 재배포 조건은 사용자 저장소의 권리 관계를 따릅니다. 본 패키지는 기존 아트에 새 오픈소스 라이선스를 부여하지 않습니다.

## 정원 배경 일러스트

- `assets/olympus-garden.webp`: 내장 이미지 생성 도구로 제작한 정면 신전·정원 일러스트(1448×1086), WebP로 인코딩.
- 그림 속 받침대 좌우 중심 24.7% / 75.3%, 상단 높이 61.5%. 중앙 벽화 중심 50% / 42.5%. 화면 너비에 관계없이 같은 4:3 좌표계를 사용합니다.
- 기존 보물 이미지의 투명 여백은 CSS 표시 영역으로 보정하며 원본 파일은 유지합니다.
- 제작 프롬프트: `art/garden-prompt.txt`.
