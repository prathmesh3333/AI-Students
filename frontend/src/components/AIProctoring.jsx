import React, { useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

const AIProctoring = ({ onViolation, isActive }) => {
  const webcamRef = useRef(null);
  const cameraRef = useRef(null);
  const startedRef = useRef(false);

  const noFaceCounter = useRef(0);
  const multiFaceCounter = useRef(0);

  const audioStartedRef = useRef(false);
  const lookingAwayCounter = useRef(0);
  const objectViolationCooldown = useRef(false);

  const objectIntervalRef = useRef(null);
  const audioIntervalRef = useRef(null);

  const modelRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      stopCamera();
      return;
    }

    if (startedRef.current) return; // prevent multiple start
    startedRef.current = true;

    let faceMesh;

    const start = async () => {
      const video = webcamRef.current?.video;
      if (!video) return;

      console.log("🎥 Proctoring Started");

      // Load Object Detection Model
      modelRef.current = await cocoSsd.load();
      console.log("✅ Object Detection Model Loaded");

      const startAudioDetection = () => {
        if (audioStartedRef.current) return;

        const video = webcamRef.current?.video;

        if (!video || !video.srcObject) return;

        audioStartedRef.current = true;

        const stream = video.srcObject;

        // Check if microphone exists
        if (!stream.getAudioTracks().length) {
          console.log("⚠️ No microphone detected");
          return;
        }

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 256;

        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        setInterval(() => {
          analyser.getByteFrequencyData(dataArray);

          const volume =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

          if (volume > 60) {
            console.log("🚨 AUDIO DETECTED");
            onViolation("AUDIO_DETECTED");
          }
        }, 2000);
      };
      setTimeout(() => {
        startAudioDetection();
      }, 2000);

      const detectObjects = async () => {

        if (!modelRef.current) return;

        const video = webcamRef.current?.video;

        if (!video || video.readyState !== 4) return;

        const predictions = await modelRef.current.detect(video);

        // predictions.forEach((prediction) => {

        //   if (prediction.class === "cell phone" && prediction.score > 0.4) {
        //     if (!objectViolationCooldown.current) {
        //       console.log("🚨 PHONE DETECTED");
        //       onViolation("PHONE_DETECTED");

        //       objectViolationCooldown.current = true;

        //       setTimeout(() => {
        //         objectViolationCooldown.current = false;
        //       }, 2000);
        //     }
        //   }
        //   if (prediction.class === "book" && prediction.score > 0.6) {
        //     console.log("🚨 BOOK DETECTED");
        //     onViolation("BOOK_DETECTED");
        //   }

        //   const persons = predictions.filter(
        //     p => p.class === "person" && p.score > 0.6
        //   );

        //   if (persons.length > 1) {
        //     console.log("🚨 SECOND PERSON DETECTED");
        //     onViolation("SECOND_PERSON");
        //   }

        // });
        const persons = predictions.filter(
          p => p.class === "person" && p.score > 0.6
        );

        if (persons.length > 1) {
          console.log("🚨 SECOND PERSON DETECTED");
          onViolation("SECOND_PERSON");
        }

        predictions.forEach((prediction) => {

          if ((prediction.class === "cell phone" || prediction.class === "remote") && prediction.score > 0.3) {

            if (!objectViolationCooldown.current) {

              console.log("🚨 PHONE DETECTED");
              onViolation("PHONE_DETECTED");

              objectViolationCooldown.current = true;

              setTimeout(() => {
                objectViolationCooldown.current = false;
              }, 2000);

            }

          }

          if (prediction.class === "book" && prediction.score > 0.35) {
            console.log("🚨 BOOK DETECTED");
            onViolation("BOOK_DETECTED");
          }

        });
      };
      objectIntervalRef.current = setInterval(() => {
        detectObjects();
      }, 500);


      faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 2,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      faceMesh.onResults((results) => {
        const faces = results.multiFaceLandmarks;

        if (!faces || faces.length === 0) {
          noFaceCounter.current++;

          if (noFaceCounter.current > 40) {
            console.log("🚨 NO FACE");
            onViolation("NO_FACE");
            noFaceCounter.current = 0;
          }
          return;
        }

        noFaceCounter.current = 0;

        if (faces.length > 1) {
          multiFaceCounter.current++;

          if (multiFaceCounter.current > 25) {
            console.log("🚨 MULTIPLE FACE");
            onViolation("MULTIPLE_FACE");
            multiFaceCounter.current = 0;
          }
        } else {
          multiFaceCounter.current = 0;
        }
        // -------- LOOKING AWAY DETECTION --------
        const face = faces[0];

        const nose = face[1];
        const leftEye = face[33];
        const rightEye = face[263];

        const eyeCenterX = (leftEye.x + rightEye.x) / 2;

        // if (Math.abs(nose.x - eyeCenterX) > 0.12) {
        //   console.log("🚨 LOOKING AWAY FROM SCREEN");
        //   onViolation("LOOKING_AWAY");
        // }

        const diff = Math.abs(nose.x - eyeCenterX);

        if (diff > 0.15) {
          lookingAwayCounter.current++;

          if (lookingAwayCounter.current > 20) {
            console.log("🚨 LOOKING AWAY");
            onViolation("LOOKING_AWAY");
            lookingAwayCounter.current = 0;
          }
        } else {
          lookingAwayCounter.current = 0;
        }

      });

      cameraRef.current = new Camera(video, {
        onFrame: async () => {
          if (faceMesh) {
            await faceMesh.send({ image: video });
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current.start();
    };

    const timer = setTimeout(start, 1200);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isActive]);


  const stopCamera = () => {
    console.log("🛑 Proctoring Stopped");

    startedRef.current = false;
    audioStartedRef.current = false;

    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    const video = webcamRef.current?.video;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  };

  if (!isActive) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        right: 10,
        zIndex: 9999,
        border: "2px solid #007bff",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <Webcam
        ref={webcamRef}
        width={400}
        height={300}
        audio={true}
        mirrored={true}
        videoConstraints={{
          facingMode: "user",
        }}
      />
    </div>
  );
};

export default AIProctoring;