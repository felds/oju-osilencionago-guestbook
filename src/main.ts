import {
    getFirestore,
    collection,
    addDoc,
    enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js"
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js"

const firebaseConfig = {
    apiKey: "AIzaSyBlCw-x2tnlx_3u1_5O0Szd_oWo7Ux4-oY",
    authDomain: "silencionago-9ec09.firebaseapp.com",
    projectId: "silencionago-9ec09",
    storageBucket: "silencionago-9ec09.appspot.com",
    messagingSenderId: "630924541018",
    appId: "1:630924541018:web:5d8ab1e43f31940bff2c63",
    measurementId: "G-X158R6ZQ2R",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == "failed-precondition") {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        // ...
    } else if (err.code == "unimplemented") {
        // The current browser does not support all of the features required to enable persistence
        // ...
    }
})

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("drawingCanvas")
    const ctx = canvas.getContext("2d")
    const undoButton = document.getElementById("undoButton")
    const cleanButton = document.getElementById("cleanButton")
    const continueButton = document.getElementById("continueButton")
    const formScreen = document.getElementById("formScreen")
    const saveButton = document.getElementById("saveButton")
    const cancelButton = document.getElementById("cancelButton")
    const confirmationScreen = document.getElementById("confirmationScreen")
    const savedDrawing = document.getElementById("savedDrawing")
    const savedData = document.getElementById("savedData")
    const startOverButton = document.getElementById("startOverButton")
    let isDrawing = false
    let drawingHistory = []

    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight;
    canvas.width = 640
    canvas.height = 480

    cleanButton.addEventListener("click", function () {
        drawingHistory = []
        redrawCanvas()
    })
    continueButton.addEventListener("click", function () {
        toggleScreen(formScreen, "block", [canvas, undoButton, cleanButton, continueButton], "none")
    })

    function saveDataOffline(drawingDataUrl, formData) {
        // Create an object representing the document
        const offlineData = {
            drawing: drawingDataUrl,
            name: formData.name,
            email: formData.email,
            city: formData.city,
            state: formData.state,
            timestamp: new Date().toISOString(), // Save as string
        }

        // Retrieve existing offline data from local storage
        let offlineDataList = JSON.parse(localStorage.getItem("offlineData")) || []

        // Add new data to the list
        offlineDataList.push(offlineData)

        // Save updated list back to local storage
        localStorage.setItem("offlineData", JSON.stringify(offlineDataList))
    }

    function uploadOfflineData() {
        let offlineDataList = JSON.parse(localStorage.getItem("offlineData")) || []

        offlineDataList.forEach((data) => {
            uploadToFirestore(data.drawing, data)
        })

        // Clear offline data after uploading
        localStorage.setItem("offlineData", JSON.stringify([]))
    }

    function uploadToFirestore(drawingDataUrl, formData) {
        const collectionRef = collection(db, "drawings")

        addDoc(collectionRef, {
            drawing: drawingDataUrl,
            name: formData.name,
            email: formData.email,
            city: formData.city,
            state: formData.state,
            timestamp: formData.timestamp || new Date(),
        })
            .then(() => {
                console.log("Data saved to Firestore")
            })
            .catch((error) => {
                console.error("Error saving data to Firestore: ", error)
            })
    }

    saveButton.addEventListener("click", function () {
        event.preventDefault()
        const drawingDataUrl = document.getElementById("drawingCanvas").toDataURL()
        const formData = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            city: document.getElementById("city").value,
            state: document.getElementById("state").value,
        }

        if (navigator.onLine) {
            uploadToFirestore(drawingDataUrl, formData)
        } else {
            saveDataOffline(drawingDataUrl, formData)
        }

        // Display the saved image and data
        savedDrawing.src = drawingDataUrl
        savedData.innerHTML = `<p>Name: ${formData.name}</p>
                                         <p>Email: ${formData.email}</p>
                                         <p>City: ${formData.city}</p>
                                         <p>State: ${formData.state}</p>`

        // Transition to the confirmation screen
        toggleScreen(confirmationScreen, "block", [formScreen], "none")
    })

    window.addEventListener("online", uploadOfflineData)

    startOverButton.addEventListener("click", function () {
        // Reset the canvas
        drawingHistory = []
        redrawCanvas()

        // Clear the form fields
        document.getElementById("name").value = ""
        document.getElementById("email").value = ""
        document.getElementById("city").value = ""
        document.getElementById("state").value = ""

        // Hide the confirmation screen and show the drawing screen
        toggleScreen(canvas, "block", [confirmationScreen, formScreen], "none")
        undoButton.style.display = "block"
        cleanButton.style.display = "block"
        continueButton.style.display = "block"
    })

    function toggleScreen(elementToShow, displayStyleToShow, elementsToHide, displayStyleToHide) {
        elementToShow.style.display = displayStyleToShow
        elementsToHide.forEach((element) => {
            element.style.display = displayStyleToHide
        })
    }

    function drawSegment(x1, y1, pressure1, x2, y2, pressure2) {
        // Calculate the average pressure for smoother transitions
        const averagePressure = (pressure1 + pressure2) / 2
        ctx.lineWidth = averagePressure * 10
        ctx.strokeStyle = "#fab900"
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
    }

    function drawStroke(stroke) {
        for (let i = 0; i < stroke.length - 1; i++) {
            const [x1, y1, pressure1] = stroke[i]
            const [x2, y2, pressure2] = stroke[i + 1]
            drawSegment(x1, y1, pressure1, x2, y2, pressure2)
        }
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawingHistory.forEach(drawStroke)
    }

    function getCanvasCoordinates(event, canvas) {
        const rect = canvas.getBoundingClientRect()
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        }
    }

    function handleStart(event, pressure) {
        const { x, y } = getCanvasCoordinates(event, canvas)
        isDrawing = true
        drawingHistory.push([[x, y, pressure]])
    }

    function handleMove(event, pressure) {
        if (!isDrawing) return
        const { x, y } = getCanvasCoordinates(event, canvas)
        const stroke = drawingHistory[drawingHistory.length - 1]
        stroke.push([x, y, pressure])
        drawStroke(stroke.slice(-2)) // Draw only the last segment
    }

    function handleEnd() {
        isDrawing = false
    }

    function getTouchPressure(touch) {
        return touch.force || 0.5 // Default pressure for devices not supporting pressure
    }

    // Mouse Events
    canvas.addEventListener("mousedown", (e) => handleStart(e, 0.5))
    canvas.addEventListener("mousemove", (e) => handleMove(e, 0.5))
    canvas.addEventListener("mouseup", handleEnd)
    canvas.addEventListener("mouseout", handleEnd)

    // Touch Events
    canvas.addEventListener("touchstart", (e) => {
        const touch = e.touches[0]
        handleStart(touch, getTouchPressure(touch))
        e.preventDefault() // Prevents default touch behavior, like scrolling
    })

    canvas.addEventListener("touchmove", (e) => {
        const touch = e.touches[0]
        handleMove(touch, getTouchPressure(touch))
        e.preventDefault()
    })

    canvas.addEventListener("touchend", handleEnd)
    canvas.addEventListener("touchcancel", handleEnd)

    undoButton.addEventListener("click", function () {
        if (drawingHistory.length > 0) {
            drawingHistory.pop()
            redrawCanvas()
        }
    })

    const userForm = document.getElementById("userForm")
})
