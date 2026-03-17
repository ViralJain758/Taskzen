import { useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 bg-gray-900 text-white p-4">
      <h2 className="text-xl font-bold mb-6">Taskzen</h2>

      <div className="space-y-2">
        <button
          onClick={() => navigate("/")}
          className="block w-full text-left p-2 hover:bg-gray-700"
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
