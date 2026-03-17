import React from "react";

export default function Footer() {
    return (
        <footer
            style={{
                padding: "12px 0",
                backgroundColor: "rgb(232, 227, 227)",
                textAlign: "center",
                position: "relative",
                width: "100%",
                bottom: "0",
                left: "0",
                right: "0",
                zIndex: "999"
            }}
        >
            <div className="text-center pt-1">
                <a
                    href="https://www.linkedin.com/in/akshata-ganbote-7a3847247/"
                    target="_blank"
                    rel="noreferrer"
                >
                    <i className="bi bi-linkedin mx-2" style={{ fontSize: "20px" }}></i>
                </a>

                <a
                    href="https://akshata-ganbote.netlify.app/"
                    target="_blank"
                    rel="noreferrer"
                >
                    <i className="bi bi-globe mx-2" style={{ fontSize: "20px" }}></i>
                </a>

                <a
                    href="https://github.com/AkshataGanbote"
                    target="_blank"
                    rel="noreferrer"
                >
                    <i className="bi bi-github mx-2" style={{ fontSize: "21px" }}></i>
                </a>

                <a
                    href="mailto:akshataganbote61843@gmail.com"
                    target="_blank"
                    rel="noreferrer"
                >
                    <i className="bi bi-envelope-fill mx-2" style={{ fontSize: "21px" }}></i>
                </a>
            </div>
        </footer>
    );
}
