/*
// ==========================================
// NOT USED: Home.jsx
// Reason: This page component is not included in the application's React Router (`App.jsx`).
// The root path (`/`) points to `LandingPage.jsx`. Also, this page is the only one making
// a request to the obsolete `/api/rss/fetch` endpoint.
// ==========================================

import { useEffect, useState } from "react";
import api from "../api/axios";

const Home = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/rss/fetch");
        setMessage(res.data.message);
      } catch (error) {
        console.error("API Error:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>InSight AI</h1>
      <p>{message}</p>
    </div>
  );
};

export default Home;
*/