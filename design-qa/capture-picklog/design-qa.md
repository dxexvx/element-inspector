# 요소 캡처와 Picklog 연결 시각 검증 · 1.3.0

- source visual truth path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/baseline-fields-desktop.png`
- baseline implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/baseline-fields-desktop.png`
- desktop implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/implementation-fields-desktop.png`
- tablet implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/implementation-fields-tablet.png`
- mobile implementation screenshot path: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/implementation-fields-mobile.png`
- browser capture command: `CAPTURE_PHASE=baseline|implementation EXTENSION_DIR=$PWD QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a node tests/capture-settings.cjs`
- rendered test receipt: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/capture-receipt.json`

- baseline CSS viewport: 1920x1080
- desktop CSS viewport: 1920x1080
- tablet CSS viewport: 1024x768
- mobile CSS viewport: 390x844

## State / required fidelity surfaces

실제 MV3 options.html과 popup.html, light theme, 격리 Chromium151.0.7922.34, 합성자료, CtrlShiftY와11개 복사필드 모두선택, 기본캡처off/고급설정닫힘. baseline은동일worktree경로의변경전1.2.1, implementation은1.3.0이다. 설정·비교는DPR1, CSS1920×1080/1024×768/390×844 및popup320×600을사용한다. PNG는같은크기,비교는가로2배다. 저장이동선과설명읽기용페이지세로스크롤을유지한다.

원래run루트에생성한triad는검증뒤동일바이트로본feature하위로옮겼다. 정확한생성명령과이동은실행기록에연결한다.

## Comparison history / findings

실제 비교 4쌍과 미리보기·고급 설정 캡처를 열어 확인했다. 기존 입력·복사 필드 구성을 유지하고 캡처 선택과 native details를 추가했다. PNG 다운로드와 offscreen 권한은 없다. 세 폭에서 가로 넘침이 없고, 저장·기본값·연결 버튼은44px이다. 설명과 입력은 일반체이며 체크박스·summary·라벨을 키보드로 조작할 수 있다. 장식·카드 중첩·상단 영문 배지는 추가하지 않았다. 남은 P0/P1/P2는 없다.

- comparison desktop: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/comparison-fields-desktop.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/baseline-fields-desktop.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/implementation-fields-desktop.png`
- comparison tablet: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/comparison-fields-tablet.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/baseline-fields-tablet.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/implementation-fields-tablet.png`
- comparison mobile: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/comparison-fields-mobile.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/baseline-fields-mobile.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/implementation-fields-mobile.png`
- comparison popup: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/comparison-fields-popup.png`; baseline `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/baseline-fields-popup.png`; implementation `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/design-qa/capture-picklog/implementation-fields-popup.png`

## Primary interaction / proof

`QA_DIR=/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a npm run test:capture` passed: 실제MV3 캡처15묶음,픽셀전체일치·잘림·미리보기PNG+text clipboard readback·단일POST/원본hash검사·정확ref복사·PAT세션/영구저장없음/content접근거부·401/403/원본불일치·프레임fallback·연결해제·고급설정세폭. API는합성sink로명시한다. 별도`python3 tools/verify-picklog.py /Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a`가실제기존OpenBao PAT로캡처·업로드·원본조회·복사ID를확인했다. 실제cap_01m7m05kgb5bmxzcy4f61ayz54,844ms,cleanup DELETE와목록readback true다.

기존`npm test`의30묶음/11필드독립복사도passed,pageerror0. 테스트는owned browser/profile/server를finally에서정리했다. 선택권한은격리프로필의Chrome관리API로실제로부여했으며native허용대화상자전체검증으로주장하지않는다. 실제캡처는네이티브viewport1280계열을사용해CDP가상viewport왜곡을피했고설정캡처는위CSS폭을사용한다.

새로확인한문제와조치: source상태알림이닫힌고급영역에연결되던selector를#settings-status로고정했다. Chrome151의offscreen Clipboard API초점거부는원인확인후경로/권한을제거하고포커스된확장미리보기에서이미지복사를검증했다. 캡처quota는550ms간격으로예약하며탭/문서/geometry변경은다른화면저장전에거부한다.

- focused-region implementation: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/capture-advanced-mobile.png`
- preview implementation: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/capture-preview-result.png`
- live integration implementation: `/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs/EV-20261117T051235Z-fc01399b636a/capture-live-result.png`

final result: passed
