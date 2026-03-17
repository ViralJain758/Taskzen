import { useContext } from "react";
import { AuthContext } from "../context/auth-context";

function Topbar() {
  const auth = useContext(AuthContext);

  return (
    <div className="h-14 bg-white shadow flex items-center justify-between px-6">
      <h1 className="font-semibold">Taskzen</h1>

      <div>
        <span className="mr-4">{auth?.user?.name}</span>
      </div>
    </div>
  );
}

export default Topbar;
