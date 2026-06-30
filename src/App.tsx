import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { Loading } from "./components/common/Loading";
import { Login } from "./features/auth/Login";

import { useAuth } from "./hooks/useAuth";

import { router } from "./routes";

function App() {
    const initialize = useAuth((s) => s.initialize);
    const loading = useAuth((s) => s.loading);
    const user = useAuth((s) => s.user);

    useEffect(() => {
        initialize();
    }, [initialize]);

    if (loading) {
        return <Loading />;
    }

    if (!user) {
        return <Login />;
    }

    return <RouterProvider router={router} />;
}

export default App;