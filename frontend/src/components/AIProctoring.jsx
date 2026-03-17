// import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
// import Webcam from "react-webcam";
// import { FaceMesh } from "@mediapipe/face_mesh";
// import { Camera } from "@mediapipe/camera_utils";
// import * as cocoSsd from "@tensorflow-models/coco-ssd";
// import "@tensorflow/tfjs";

// const AIProctoring = forwardRef(({ onViolation, isActive }, ref) => {
//   const webcamRef = useRef(null);
//   const cameraRef = useRef(null);
//   const startedRef = useRef(false);

//   const noFaceCounter = useRef(0);
//   const multiFaceCounter = useRef(0);

//   const audioStartedRef = useRef(false);
//   const lookingAwayCounter = useRef(0);
//   const objectViolationCooldown = useRef(false);

//   const objectIntervalRef = useRef(null);
//   const audioIntervalRef = useRef(null);

//   const modelRef = useRef(null);

//     // 🔥 GLOBAL COOLDOWN FOR SNAPSHOTS
//   const lastCaptureRef = useRef(0);

//   // 🔥 UNIFIED VIOLATION FUNCTION
//   const triggerViolation = (type) => {
//     const now = Date.now();

//     if (now - lastCaptureRef.current < 3000) return; // 3 sec cooldown

//     lastCaptureRef.current = now;

//     const snapshot = webcamRef.current?.getScreenshot();
//     console.log("🚨 VIOLATION:", type);

//     onViolation(type, snapshot);
//   };

//   useImperativeHandle(ref, () => ({
//     captureSnapshot: () => {
//       const video = webcamRef.current?.video;
//       if (!video || video.readyState !== 4) return null;
//       const canvas = document.createElement("canvas");
//       canvas.width = video.videoWidth || 640;
//       canvas.height = video.videoHeight || 480;
//       canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
//       return canvas.toDataURL("image/jpeg", 0.6);
//     }
//   }));

//   useEffect(() => {
//     if (!isActive) {
//       stopCamera();
//       return;
//     }

//     if (startedRef.current) return; // prevent multiple start
//     startedRef.current = true;

//     let faceMesh;

//     const start = async () => {
//       const video = webcamRef.current?.video;
//       if (!video) return;

//       console.log("🎥 Proctoring Started");

//       // Load Object Detection Model
//       modelRef.current = await cocoSsd.load();
//       console.log("✅ Object Detection Model Loaded");

//       const startAudioDetection = async () => {
//         if (audioStartedRef.current) return;

//         audioStartedRef.current = true;

//         try {
//           // ✅ Get REAL microphone stream (not webcam stream)
//           const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

//           const audioContext = new AudioContext();
//           const source = audioContext.createMediaStreamSource(stream);
//           const analyser = audioContext.createAnalyser();

//           analyser.fftSize = 512;
//           source.connect(analyser);

//           const dataArray = new Uint8Array(analyser.fftSize);

//           let baseline = 0;
//           let calibrated = false;
//           let lastTrigger = 0;

//           // 🔹 CALIBRATE (2 sec)
//           setTimeout(() => {
//             analyser.getByteTimeDomainData(dataArray);

//             baseline =
//               dataArray.reduce((sum, v) => sum + Math.abs(v - 128), 0) /
//               dataArray.length;

//             calibrated = true;
//             console.log("🎤 Baseline:", baseline);
//           }, 2000);

//           // 🔹 DETECT AUDIO
//           audioIntervalRef.current = setInterval(() => {
//             if (!calibrated) return;

//             analyser.getByteTimeDomainData(dataArray);

//             const volume =
//               dataArray.reduce((sum, v) => sum + Math.abs(v - 128), 0) /
//               dataArray.length;

//             console.log("Volume:", volume); // DEBUG

//             if (volume > baseline + 5 && Date.now() - lastTrigger > 2000) {
//               console.log("🚨 AUDIO DETECTED");

//               lastTrigger = Date.now();
//               triggerViolation("AUDIO_DETECTED");
//             }

//           }, 800);

//         } catch (err) {
//           console.error("Mic access denied:", err);
//         }
//       };
//       setTimeout(() => {
//         startAudioDetection();
//       }, 2000);

//       const detectObjects = async () => {

//         if (!modelRef.current) return;

//         const video = webcamRef.current?.video;

//         if (!video || video.readyState !== 4) return;

//         const predictions = await modelRef.current.detect(video);

//         const persons = predictions.filter(
//           p => p.class === "person" && p.score > 0.5
//         );

//         if (persons.length > 1) {
//           console.log("🚨 SECOND PERSON DETECTED");
//           triggerViolation("SECOND_PERSON");
//         }

//         predictions.forEach((prediction) => {

//           if ((prediction.class === "cell phone" || prediction.class === "remote") && prediction.score > 0.3) {

//             if (!objectViolationCooldown.current) {

//               console.log("🚨 PHONE DETECTED");
//               triggerViolation("PHONE_DETECTED");

//               objectViolationCooldown.current = true;

//               setTimeout(() => {
//                 objectViolationCooldown.current = false;
//               }, 2000);

//             }

//           }

//           if (prediction.class === "book" && prediction.score > 0.3) {
//             console.log("🚨 BOOK DETECTED");
//             triggerViolation("BOOK_DETECTED");
//           }

//         });
//       };
//       objectIntervalRef.current = setInterval(() => {
//         detectObjects();
//       }, 500);


//       faceMesh = new FaceMesh({
//         locateFile: (file) =>
//           `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
//       });

//       faceMesh.setOptions({
//         maxNumFaces: 2,
//         refineLandmarks: true,
//         minDetectionConfidence: 0.7,
//         minTrackingConfidence: 0.7,
//       });

//       faceMesh.onResults((results) => {
//         const faces = results.multiFaceLandmarks;

//         if (!faces || faces.length === 0) {
//           noFaceCounter.current++;

//           if (noFaceCounter.current > 40) {
//             console.log("🚨 NO FACE");
//             triggerViolation("NO_FACE");
//             noFaceCounter.current = 0;
//           }
//           return;
//         }

//         noFaceCounter.current = 0;

//         if (faces.length > 1) {
//           multiFaceCounter.current++;

//           if (multiFaceCounter.current > 25) {
//             console.log("🚨 MULTIPLE FACE");
//             triggerViolation("MULTIPLE_FACE");
//             multiFaceCounter.current = 0;
//           }
//         } else {
//           multiFaceCounter.current = 0;
//         }
//         // -------- LOOKING AWAY DETECTION --------
//         const face = faces[0];

//         const nose = face[1];
//         const leftEye = face[33];
//         const rightEye = face[263];

//         const eyeCenterX = (leftEye.x + rightEye.x) / 2;

//         const diff = Math.abs(nose.x - eyeCenterX);

//         if (diff > 0.15) {
//           lookingAwayCounter.current++;

//           if (lookingAwayCounter.current > 20) {
//             console.log("🚨 LOOKING AWAY");
//             triggerViolation("LOOKING_AWAY");
//             lookingAwayCounter.current = 0;
//           }
//         } else {
//           lookingAwayCounter.current = 0;
//         }

//       });

//       cameraRef.current = new Camera(video, {
//         onFrame: async () => {
//           if (faceMesh) {
//             await faceMesh.send({ image: video });
//           }
//         },
//         width: 640,
//         height: 480,
//       });

//       cameraRef.current.start();
//     };

//     const timer = setTimeout(start, 1200);

//     return () => {
//       clearTimeout(timer);
//       stopCamera();
//     };
//   }, [isActive]);


//   const stopCamera = () => {
//     console.log("🛑 Proctoring Stopped");

//     startedRef.current = false;
//     audioStartedRef.current = false;

//     if (cameraRef.current) {
//       cameraRef.current.stop();
//       cameraRef.current = null;
//     }

//     const video = webcamRef.current?.video;
//     if (video && video.srcObject) {
//       video.srcObject.getTracks().forEach((track) => track.stop());
//       video.srcObject = null;
//     }

//     if (audioIntervalRef.current) {
//       clearInterval(audioIntervalRef.current);
//       audioIntervalRef.current = null;
//     }
//   };

//   if (!isActive) return null;

//   return (
//     <div
//       style={{
//         position: "fixed",
//         bottom: 10,
//         right: 10,
//         zIndex: 9999,
//         border: "2px solid #007bff",
//         borderRadius: "8px",
//         overflow: "hidden",
//         background: "#000",
//       }}
//     >
//       <Webcam
//         ref={webcamRef}
//         width={400}
//         height={300}
//         audio={true}
//         mirrored={true}
//         videoConstraints={{
//           facingMode: "user",
//         }}
//       />
//     </div>
//   );
// });

// export default AIProctoring;
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Webcam from "react-webcam";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

const AIProctoring = forwardRef(({ onViolation, isActive }, ref) => {
  const webcamRef = useRef(null);
  const cameraRef = useRef(null);
  const startedRef = useRef(false);

  const noFaceCounter = useRef(0);
  const multiFaceCounter = useRef(0);
  const lookingAwayCounter = useRef(0);

  const audioStartedRef = useRef(false);
  const objectViolationCooldown = useRef(false);

  const objectIntervalRef = useRef(null);
  const audioIntervalRef = useRef(null);

  const baselineRef = useRef({ x: 0, y: 0, set: false });
  const modelRef = useRef(null);

  // 🔥 GLOBAL COOLDOWN FOR SNAPSHOTS
  // const lastCaptureRef = useRef(0);
  const violationCooldownRef = useRef({});

  // 🔥 UNIFIED VIOLATION FUNCTION
  // const triggerViolation = (type) => {
  //   const now = Date.now();

  //   if (now - lastCaptureRef.current < 3000) return; // 3 sec cooldown

  //   lastCaptureRef.current = now;

  //   const snapshot = webcamRef.current?.getScreenshot();
  //   console.log("🚨 VIOLATION:", type);

  //   onViolation(type, snapshot);
  // };

  const getSafeSnapshot = () => {
    const video = webcamRef.current?.video;

    if (!video || video.readyState !== 4) {
      console.log("❌ Video not ready");
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.7);
  };
  const triggerViolation = (type) => {
    const now = Date.now();

    const lastTime = violationCooldownRef.current[type] || 0;

    // 🔥 cooldown per violation type (2 sec)
    if (now - lastTime < 2000) return;

    violationCooldownRef.current[type] = now;

    // const snapshot = webcamRef.current?.getScreenshot();
    const snapshot = getSafeSnapshot();

    if (!snapshot) {
      console.log("❌ Snapshot failed");
      return;
    }

    console.log("🚨 VIOLATION:", type);

    onViolation(type, snapshot);
  };

  useImperativeHandle(ref, () => ({
    captureSnapshot: () => webcamRef.current?.getScreenshot()
  }));

  useEffect(() => {
    if (!isActive) {
      stopCamera();
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    let faceMesh;

    const start = async () => {
      const video = webcamRef.current?.video;
      if (!video) return;

      console.log("🎥 Proctoring Started");

      modelRef.current = await cocoSsd.load();

      // 🔊 AUDIO DETECTION
      const startAudioDetection = async () => {
        if (audioStartedRef.current) return;
        audioStartedRef.current = true;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();

          analyser.fftSize = 512;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.fftSize);

          let baseline = 0;
          let calibrated = false;

          setTimeout(() => {
            analyser.getByteTimeDomainData(dataArray);

            baseline =
              dataArray.reduce((sum, v) => sum + Math.abs(v - 128), 0) /
              dataArray.length;

            calibrated = true;
          }, 2000);

          audioIntervalRef.current = setInterval(() => {
            if (!calibrated) return;

            analyser.getByteTimeDomainData(dataArray);

            const volume =
              dataArray.reduce((sum, v) => sum + Math.abs(v - 128), 0) /
              dataArray.length;

            if (volume > baseline + 5) {
              triggerViolation("AUDIO_DETECTED");
            }
          }, 800);

        } catch (err) {
          console.error("Mic error:", err);
        }
      };

      setTimeout(startAudioDetection, 2000);

      // 📦 OBJECT DETECTION
      const detectObjects = async () => {
        if (!modelRef.current) return;

        const video = webcamRef.current?.video;
        if (!video || video.readyState !== 4) return;

        const predictions = await modelRef.current.detect(video);

        // const persons = predictions.filter(
        //   p => p.class === "person" && p.score > 0.5
        // );
        const persons = predictions.filter(p => {
          const [x, y, width, height] = p.bbox;

          const area = width * height;

          return (
            p.class === "person" &&
            p.score > 0.75 &&          // 🔥 higher confidence
            area > 50000               // 🔥 ignore small detections
          );
        });

        if (persons.length > 1) {
          triggerViolation("SECOND_PERSON");
        }

        predictions.forEach((p) => {
          if ((p.class === "cell phone" || p.class === "remote") && p.score > 0.3) {
            if (!objectViolationCooldown.current) {
              triggerViolation("PHONE_DETECTED");

              objectViolationCooldown.current = true;
              setTimeout(() => {
                objectViolationCooldown.current = false;
              }, 2000);
            }
          }

          if (p.class === "book" && p.score > 0.3) {
            triggerViolation("BOOK_DETECTED");
          }
        });
      };

      objectIntervalRef.current = setInterval(detectObjects, 600);

      // 👤 FACE DETECTION
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
            triggerViolation("NO_FACE");
            noFaceCounter.current = 0;
          }
          return;
        }

        noFaceCounter.current = 0;

        if (faces.length > 1) {
          multiFaceCounter.current++;

          if (multiFaceCounter.current > 25) {
            triggerViolation("MULTIPLE_FACE");
            multiFaceCounter.current = 0;
          }
        } else {
          multiFaceCounter.current = 0;
        }

        // const face = faces[0];
        // const nose = face[1];
        // const leftEye = face[33];
        // const rightEye = face[263];

        // const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        // const diff = Math.abs(nose.x - eyeCenterX);

        // if (diff > 0.08) {
        //   lookingAwayCounter.current++;

        //   if (lookingAwayCounter.current > 20) {
        //     triggerViolation("LOOKING_AWAY");
        //     lookingAwayCounter.current = 0;
        //   }
        // } else {
        //   lookingAwayCounter.current = 0;
        // }

        const face = faces[0];

        const nose = face[1];
        const leftEye = face[33];
        const rightEye = face[263];

        // Center of eyes
        const eyeCenterX = (leftEye.x + rightEye.x) / 2;

        // Difference (left-right head turn)
        const diffX = Math.abs(nose.x - eyeCenterX);

        // 🎯 STRONG THRESHOLD (LESS SENSITIVE)
        const THRESHOLD = 0.11;

        // DEBUG (optional)
        console.log("diffX:", diffX);

        if (diffX > THRESHOLD) {
          lookingAwayCounter.current++;

          // 🎯 NEED CONSISTENT FRAMES
          if (lookingAwayCounter.current > 25) {
            console.log("🚨 LOOKING AWAY CONFIRMED");
            triggerViolation("LOOKING_AWAY");
            lookingAwayCounter.current = 0;
          }
        } else {
          // smooth reset (avoid flicker)
          lookingAwayCounter.current = Math.max(0, lookingAwayCounter.current - 2);
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
    startedRef.current = false;
    audioStartedRef.current = false;

    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (objectIntervalRef.current) clearInterval(objectIntervalRef.current);

    const video = webcamRef.current?.video;
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
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
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
      }}
    >
      <Webcam
        ref={webcamRef}
        width={400}
        height={300}
        audio={true}
        mirrored={true}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: "user",
        }}
      />
    </div>
  );
});

export default AIProctoring;