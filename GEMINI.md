# PROJECT: DateSync (Couple Date Planner)

## 1. Project Overview
- **Description:** 연인(A, B)을 위한 인터랙티브 데이트 플래너 웹 애플리케이션. 한 명(A)이 시간대별 데이트 코스(장소, 식사, 활동 등)를 기획하면, 다른 한 명(B)이 해당 코스에 대해 '동의(Accept)', '거절(Reject)', '보류(Pending)'로 응답하는 쌍방향 플래닝 서비스.
- **Target Platform:** Web (Responsive, Mobile-First UI)
- **Tech Stack:** 
  - Frontend: React (Vite), Tailwind CSS (트렌디하고 빠른 스타일링), Framer Motion (스무스한 상태 변화 애니메이션)
  - State Management: Zustand (간량한 전역 상태 및 유저 세션 관리)
  - Data Fetching/Mocking: 초기는 LocalStorage를 활용한 Mock 데이터로 구현하되, 이후 BaaS(Supabase/Firebase) 연동을 고려한 아키텍처 설계.
  - Deployment: Netlify (GitHub Repo CI/CD 연동)

## 2. Core Features & Requirements

### A. Calendar & Date Selection
- 캘린더 라이브러리(e.g., `react-datepicker` 또는 `react-calendar`)를 사용하여 데이트 날짜를 선택.
- 특정 날짜를 클릭하면 해당 날짜의 타임라인(Timeline) 뷰로 이동.

### B. Timeline Planning (Planner User - A)
- 시간(Time), 활동 내용(Activity), 위치/식당(Location), 관련 링크(Link)를 입력하는 폼 제공.
- 입력된 계획은 시간 순서대로 정렬된 타임라인 UI로 렌더링.

### C. Action System (Reviewer User - B)
- **상태 정의:** 각 계획 카드는 `status: 'idle' | 'accepted' | 'rejected' | 'pending'` 상태를 가짐.
- **동의 (Accept):** 카드가 초록색/활성화 테마로 시각적 강조. 타임라인에 픽스됨.
- **거절 (Reject):** 부드러운 Exit 애니메이션(Framer Motion)과 함께 타임라인에서 영구 삭제됨.
- **보류 (Pending):** 카드가 노란색/대기 테마로 변경되며, "추가 논의 필요" 뱃지가 붙음 (상태 변화 UI 필수).

### D. Rich Cardlink (Preview) System ⭐️ (CRITICAL)
- 단순 URL 텍스트가 아닌, OpenGraph 데이터를 활용한 **Cardlink UI** 구현.
- **Naver Map, Google Map:** 위치 링크 삽입 시 장소명, 썸네일, 주소 요약이 담긴 미니 지도/장소 카드 렌더링.
- **Instagram:** 핫플, 맛집 등의 릴스/게시물 링크 삽입 시, 썸네일 이미지와 본문 일부가 포함된 인스타그램 스타일 프리뷰 카드 렌더링.
- *Developer Note:* AI는 URL을 파싱하여 메타데이터를 가져오는 Mock 함수를 구현하거나, `react-microlink` 같은 외부 OpenGraph API 라이브러리를 활용한 컴포넌트(`<LinkPreview />`)를 작성할 것.

## 3. UI / UX Design Guidelines
- **Concept:** Trendy, Modern, Glassmorphism. 요즘 2030이 좋아하는 깔끔하고 감각적인 디자인.
- **Color Palette:** 
  - Primary: Soft Coral (`#FF6B6B`) & Sunset Orange (`#FF8E53`) - 데이트의 설렘 강조.
  - Background: Off-white / Light Gray (카드 UI가 돋보이도록).
- **Typography:** 깨끗한 고딕 계열 (Pretendard 권장).
- **Interactions:** 버튼 Hover, 상태 변경(수락/거절) 시 끊김 없는 트랜지션 애니메이션 필수 적용. 모바일 환경에서 터치/스와이프 친화적인 카드 컴포넌트.

## 4. Execution Instructions for AI
1. **Scaffolding:** `npm create vite@latest`를 사용하여 React + TypeScript 기반으로 프로젝트를 세팅하고 Tailwind CSS를 초기화할 것.
2. **Components:** 다음 구조로 컴포넌트를 분리하여 작성할 것.
   - `CalendarView`: 날짜 선택 UI
   - `TimelineBoard`: 선택된 날짜의 계획 리스트
   - `PlanCard`: 개별 계획 아이템 (시간, 내용 포함)
   - `ActionButtons`: 수락/거절/보류 버튼 그룹
   - `LinkPreview`: URL 입력 시 렌더링되는 Rich Card 컴포넌트
3. **Mock Data Flow:** 백엔드가 없어도 UI/UX를 완전히 테스트할 수 있도록 초기 상태(Initial State)가 담긴 Mock 데이터를 만들고 CRUD 및 상태 변경 로직을 구현할 것.
4. Output: 각 단계를 완성할 때마다 완벽하게 작동하는 코드를 반환하고, Netlify 배포 시 문제가 없도록 `netlify.toml` 설정 파일(SPA 라우팅용)도 함께 제공할 것.

## 5. Build & Deployment Hardening (Netlify CI/CD)

### A. Critical Build Failure History (TypeScript Errors)
Netlify 빌드 중 `tsc -b` 과정에서 발생하는 에러 리스트입니다. 코드 수정 시 반드시 주의해야 합니다.
- **TS6133 (Unused Variables/Imports):** 선언되었으나 사용되지 않는 변수나 임포트가 있으면 빌드가 즉시 중단됩니다.
  - `CalendarView.tsx`: `rows`, `days`, `day` 변수 미사용 에러.
  - `LinkPreview.tsx`: `AnimatePresence`, `Loader2`, `getLinkType` 임포트 미사용 에러.
- **Any Type Restriction:** `src/store/useAuthStore.ts` 등에서 `any` 타입을 사용할 경우 린트 에러가 발생하므로 명시적 타입을 지정해야 합니다.

### B. Deployment Safety Rules
1. **No Unused Code:** 사용하지 않는 변수, 함수, 임포트는 즉시 삭제합니다. (Netlify의 엄격한 빌드 옵션 때문)
2. **Local Build Verification:** 모든 변경 사항을 제출하기 전, 로컬 환경에서 `npm run build`를 실행하여 `tsc` 에러가 없는지 반드시 확인합니다.
3. **PGRST116 Handling:** Supabase `.single()` 호출 시 데이터가 없으면 에러가 발생하므로, 신규 유저 대응을 위해 가급적 `.maybeSingle()`을 사용하고 `null` 체크를 수행합니다.
4. **Environment Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 Netlify 환경 설정에 등록되어 있는지 확인합니다.