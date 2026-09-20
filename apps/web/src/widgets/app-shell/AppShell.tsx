import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="app-frame">
      <header className="app-header">
        <NavLink className="wordmark" to="/">
          Tripic
        </NavLink>
        <nav aria-label="주요 메뉴">
          <NavLink to="/" end>
            여행 지도
          </NavLink>
          <NavLink to="/records">내 기록</NavLink>
          <NavLink to="/settings">설정</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
