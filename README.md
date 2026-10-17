# 엘리먼트 검사기

포인터로 웹페이지 요소를 강조하고 id·class를 확인한 뒤, 클릭하여 페이지·영역 맥락과 CSS 식별자를 함께 복사하는 Chrome Manifest V3 확장입니다. 복사한 식별자를 에이전트에게 붙여 수정 위치를 전달할 수 있습니다.

## 설치

1. `npm run package`로 실행 폴더와 ZIP을 만듭니다. 빌드 도구나 서버는 필요하지 않습니다.
2. Chrome의 `chrome://extensions`에서 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드합니다**를 눌러 이 프로젝트의 `output/element-inspector` 폴더를 선택합니다. 이 프로젝트 루트도 직접 로드할 수 있습니다.
4. 이미 열려 있던 웹페이지는 새로고침합니다.

로드 폴더: `/Users/devis/Yeo/Workspaces/Ychis/Code/devs/chrome-extensions/element-inspector/output/element-inspector`

## 사용

- 기본 **Alt + Shift + E**로 검사를 켜거나 끕니다. macOS의 Alt는 Option입니다. 확장 메뉴의 **검사 켜기·끄기**도 사용할 수 있습니다.
- 포인터 아래 요소를 강조하고 태그·id·class와 복사할 식별자를 보여줍니다.
- 클릭하면 원래 페이지의 링크/버튼 동작을 막고 페이지 URL·문서 제목·가까운 영역 제목·요소/행 텍스트·태그·id·class·CSS 식별자를 클립보드에 함께 복사합니다. 복사 후 검사가 끝나며 다음 클릭은 원래대로 작동합니다. **Esc**는 복사 없이 종료합니다.
- 확장 메뉴 **단축키 설정**에서 입력 칸을 선택하고 조합키를 누른 뒤 **저장**합니다. Ctrl·Command·Alt 중 하나와 영문/숫자가 필요하고 Shift를 추가할 수 있습니다. 기존 탭에도 즉시 적용되며 브라우저를 다시 열어도 저장됩니다.
- ID를 우선 사용하고 중복 ID/class 또는 식별자 없는 요소는 유일한 CSS 경로를 만듭니다. 특수문자는 CSS 방식으로 이스케이프합니다.
- 열린 Shadow DOM은 `#host >>> #inside`처럼 경계를 표시합니다. `>>>`는 전달용 표기이며 하나의 `querySelector`에 넣는 표준 CSS가 아닙니다. 각 경계에서 `shadowRoot`로 들어가세요.
- HTTP(S) iframe에서도 강조·복사가 작동하며 프레임 주소를 함께 표시합니다. 영역 제목은 가까운 heading·영역 이름을 우선 사용하며 찾지 못하면 `(제목 없음)`으로 표시합니다. 표시된 텍스트는 최대240자(영역 제목120자, 문서 제목200자)로 제한하며 입력·선택·편집칸의 값은 수집하지 않습니다. URL의 인증 관련 query/hash 인자는 제외합니다.

## 범위

Chrome 내부 페이지·웹 스토어·PDF 뷰어 등 Chrome이 확장 실행을 막는 화면, file:// 페이지, 닫힌 Shadow DOM은 대상 밖입니다. 브라우저/운영체제 예약 단축키는 사용할 수 없으며 다른 확장/페이지와 충돌하면 설정에서 조합키를 바꾸세요. 페이지의 입력/편집 영역에서는 비활성 검사기의 단축키를 가로채지 않습니다.

검사기는 사용자 클릭 시에만 식별자를 복사합니다. 페이지 내용이나 식별자를 서버로 보내지 않습니다. `storage`는 단축키·탭 검사 상태 저장, `clipboardWrite`는 사용자가 선택한 식별자 복사에 사용합니다. HTTP(S) content script는 모든 사이트에서 조합키를 받기 위한 것이며 사이트 접근 권한 안내가 표시됩니다.

## 개발·검증

Node.js와 Python 3을 사용합니다. 런타임은 외부 라이브러리 없이 실행됩니다.

```sh
npm ci --ignore-scripts
npx playwright install chromium  # 브라우저가 없는 개발 환경에서만
npm run check
QA_DIR=/verified/external/artifact/run/design-qa/element-inspector npm test
npm run package
```

`QA_DIR`은 실행 증거의 명시적인 보관 경로입니다. 테스트는 임시 Chromium 프로필에 실제 확장을 설치하고 설정 저장·단축키·강조 geometry·실제 clipboard readback·클릭 차단과 복귀·iframe·Shadow DOM·실패 안내·반응형을 검사합니다. 사용자 Chrome 프로필은 변경하지 않습니다. 테스트 fixture와 Chromium의 실제 클립보드에 검증용 식별자가 복사됩니다.

공식 근거: [Chrome commands API](https://developer.chrome.com/docs/extensions/reference/api/commands), [Playwright의 실제 확장 로드](https://playwright.dev/docs/chrome-extensions). Chrome commands에는 조합키를 프로그램으로 수정하는 API가 없어 설정 화면의 페이지 키 이벤트 조합을 사용합니다.

## 1.1.0 갱신

기존 설치 폴더는 그대로입니다. `chrome://extensions`에서 **엘리먼트 검사기 새로고침**을 누른 뒤 검사할 웹페이지도 새로고침하세요. 설정한 단축키는 유지됩니다.

복사 예시:

```text
페이지 URL: https://example.com/ideas?group=54157
문서 제목: 아이디어 · 데비스라이프
영역 제목: 크롬확장프로그램
요소 텍스트: 엘리먼트검사기
요소: div
id: (없음)
class: todo-item
CSS: div#group-54157 > ul > li > div.todo-item
```

기존 CSS 문자열만 받던 도구는 복사문의 `CSS: ` 줄에서 식별자를 읽으면 됩니다. 위 주소와 문구는 출력 형식을 보여주는 예시입니다.
