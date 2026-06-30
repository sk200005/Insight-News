import React from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import About from "./pages/About";
import BiasAnalysis from "./pages/BiasAnalysis";
import LandingPage from "./pages/LandingPage";
import News from "./pages/News";
import WorkingPage from "./pages/WorkingPage";
import SmoothScroll from "./components/SmoothScroll";
import CustomCursor from "./components/CustomCursor";

function App() {
  return (
    <>
      <CustomCursor />
      <SmoothScroll>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/news" element={<News />} />
          <Route path="/bias-analysis" element={<BiasAnalysis />} />
          <Route path="/working" element={<WorkingPage />} />
        </Routes>
      </SmoothScroll>
    </>
  );
}

export default App;
