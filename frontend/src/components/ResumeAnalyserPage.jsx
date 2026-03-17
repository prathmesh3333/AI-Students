import React from "react";
import { useNavigate } from "react-router-dom";
import ResumeAnalyser from "./ResumeAnalyser";

const ResumeAnalyserPage = () => {
  const navigate = useNavigate();
  return <ResumeAnalyser onClose={() => navigate("/home")} asPage />;
};

export default ResumeAnalyserPage;
