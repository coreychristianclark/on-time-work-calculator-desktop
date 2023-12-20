document.addEventListener("DOMContentLoaded", () => {
  loadGoogleMapsApi();
});

function loadGoogleMapsApi() {
  fetch("/api/getGoogleMapsApiKey")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }
      return response.json();
    })
    .then((data) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    })
    .catch((error) => console.error("Error fetching API key:", error));
}

const form = document.querySelector("form");
const reset = document.querySelector("#reset");
const hoursOfSleep = document.querySelector("#hoursOfSleep");
const arrivalTime = document.querySelector("#arrivalTime");
const desiredHoursOfSleepInput = document.querySelector(
  ".desiredHoursOfSleepInput"
);
const desiredArrivalTimeInput = document.querySelector(
  ".desiredArrivalTimeInput"
);

const lengthOfMorningRoutineInput = document.querySelector(
  ".lengthOfMorningRoutineInput"
);

const startInputElement = document.querySelector(".startInput");
const endInputElement = document.querySelector(".endInput");

const bedTime = document.querySelector("#bedTime");

const wakeUpTime = document.querySelector("#wakeUpTime");

const matrixMilesToDestination = document.querySelector(
  "#matrixMilesToDestination"
);
const matrixDriveTime = document.querySelector("#matrixDriveTime");

let map;
let directionsService;
let directionsRenderer;
let startAutocomplete, endAutocomplete;

window.initMap = () => {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 39.8097343, lng: -98.5556199 },
    zoom: 4.2,
  });
  initAutocomplete();
};

function initAutocomplete() {
  const inputs = document.querySelectorAll(".autocomplete");

  startAutocomplete = new google.maps.places.Autocomplete(inputs[0], {
    types: ["geocode"],
  });
  endAutocomplete = new google.maps.places.Autocomplete(inputs[1], {
    types: ["geocode"],
  });

  startAutocomplete.addListener("place_changed", () => {
    const place = startAutocomplete.getPlace();
  });

  endAutocomplete.addListener("place_changed", () => {
    const place = endAutocomplete.getPlace();
  });

  function calculateDistanceAndDuration(start, end) {
    return new Promise((resolve, reject) => {
      let duration;
      const serverUrl = `https://optimal-sleep-calculator-map.uk.r.appspot.com/api/route?start=${start}&end=${end}`;

      fetch(serverUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          if (response.status === 204) {
            return null;
          }

          return response.json();
        })

        .then((data) => {
          if (data && data.status && data.rows[0].elements[0].status === "OK") {
            const distance = data.rows[0].elements[0].distance.text;
            duration = data.rows[0].elements[0].duration.text;

            matrixMilesToDestination.innerText = distance;
            matrixDriveTime.innerText = duration;
          } else {
            console.error("Error: Distance Matrix request failed.");
          }
          resolve(duration);
        })

        .catch((error) => {
          console.error("Error fetching data from Distance Matrix API:", error);
          reject(error);
        });
    });
  }

  function calculateAndDisplayRoute(start, end) {
    const request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    if (directionsRenderer) {
      directionsRenderer.setMap(null);
    }

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({});

    directionsService.route(request, function (response, status) {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setMap(map);
        directionsRenderer.setDirections(response);
      } else {
        console.error(
          "Error: Directions request failed with status: " + status
        );
      }
    });
  }

  // Takes the received value from 'duration' and breaks it down to minutes.
  function parseDuration(duration) {
    let totalMinutes = 0;
    let parts = duration.match(/(\d+)\s*(days?|hours?|mins?)/g);

    if (parts) {
      parts.forEach((part) => {
        const [value, unit] = part.split(/\s+/);
        switch (unit) {
          case "day":
          case "days":
            // Convert days into minutes.
            totalMinutes += parseInt(value, 10) * 1440;
            break;
          case "hour":
          case "hours":
            // Convert hours to minutes.
            totalMinutes += parseInt(value, 10) * 60;
            break;
          case "min":
          case "mins":
            // Minutes.
            totalMinutes += parseInt(value, 10);
            break;
          default:
            console.error("Error: Unknown duration unit:", unit);
        }
      });
    } else {
      console.error("Error: The duration format is invalid.");
    }
    return totalMinutes;
  }

  function parseTime(input) {
    // Matches the time format HH:MMam/pm.
    const timeParts = input.match(/^(\d{1,2}):(\d{2})([ap]m)?$/i);

    if (timeParts) {
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const period = timeParts[3] || "am";

      // Converts 12-hour format to a 24-hour format.
      if (period.toLowerCase() === "pm" && hours !== 12) {
        hours += 12;
      } else if (period.toLowerCase() === "am" && hours === 12) {
        hours = 0;
      }
      return hours * 60 + minutes;
    } else {
      console.error("Error: The time format is invalid.");
      return null;
    }
  }

  function minutesToTime(mins) {
    let hours = Math.floor(mins / 60);
    let minutes = mins % 60;
    let period;

    if (hours >= 24) {
      hours -= 24;
    }

    if (hours >= 12) {
      period = "pm";
      if (hours > 12) {
        hours -= 12;
      }
    } else if (hours === 0) {
      hours = 12;
      period = "am";
    } else {
      period = "am";
    }

    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}${period}`;
  }

  // Validates that only 'time' or 'duration' is entered as the type, and handles accordingly.
  function isValidFormat(input, type) {
    let regex;
    switch (type) {
      case "time":
        regex = /^(0?[1-9]|1[0-2]):[0-5][0-9](am|pm)$/i;
        break;
      case "duration":
        regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        break;
      default:
        console.error(`Error: Unrecognized format type '${type}'.`);
    }
    return regex.test(input);
  }

  function validateInput(inputElement, type, errorMessage) {
    if (!isValidFormat(inputElement.value, type)) {
      console.error(`Error: ${errorMessage}`);
      alert(errorMessage);
      resetDisplay();
      return false;
    }
    return true;
  }

  function calculateTimeDifference(arrivalInMinutes, duration, morningRoutine) {
    const totalTimeRequired = duration + morningRoutine;
    const sleepDurationInMinutes =
      parseFloat(desiredHoursOfSleepInput.value) * 60;
    let wakeUpTimeInMinutes = arrivalInMinutes - totalTimeRequired;
    let bedTimeInMinutes = wakeUpTimeInMinutes - sleepDurationInMinutes;

    // Adjust for wake up time for the next day if it's negative.
    if (wakeUpTimeInMinutes < 0) {
      wakeUpTimeInMinutes += 24 * 60;
    }

    // Adjust bedtime for the next day if it's negative.
    if (bedTimeInMinutes < 0) {
      bedTimeInMinutes += 24 * 60;
    }

    return {
      wakeUpTimeInMinutes,
      bedTimeInMinutes,
    };
  }

  function handleInfeasibleSchedule() {
    console.error("Error: The given schedule exceeds a 24-hour time frame.");
    alert("This schedule is not possible within a 24-hour time frame.");
    resetDisplay();
  }

  function resetDisplay() {
    hoursOfSleep.innerText = "X";
    arrivalTime.innerText = "X";
    bedTime.innerText = "X";
    wakeUpTime.innerText = "X";
  }

  function resetMapAndRoute() {
    startInputElement.value = "";
    endInputElement.value = "";
    matrixMilesToDestination.innerText = 0;
    matrixDriveTime.innerText = 0;
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] });
    }
    map.setCenter({ lat: 39.8097343, lng: -98.5556199 });
    map.setZoom(4.2);
  }

  reset.addEventListener("click", (e) => {
    resetDisplay();
    resetMapAndRoute();
    desiredHoursOfSleepInput.value = "";
    desiredArrivalTimeInput.value = "";
    lengthOfMorningRoutineInput.value = "";
  });

  // Beginning of FORM.
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (
      !validateInput(
        desiredHoursOfSleepInput,
        "duration",
        "Please enter a valid Desired Hours of Sleep duration in a 24-hour HH:MM format."
      )
    ) {
      return;
    }

    if (
      !validateInput(
        desiredArrivalTimeInput,
        "time",
        "Please enter a valid Desired Arrival Time in a 24-hour HH:MMam/pm format."
      )
    ) {
      return;
    }

    if (
      !validateInput(
        lengthOfMorningRoutineInput,
        "duration",
        "Please enter a valid Length of Morning Routine duration in a 24-hour HH:MM format."
      )
    ) {
      return;
    }

    let startInput = startInputElement.value;
    let endInput = endInputElement.value;

    if (startInput === "") {
      console.error("Error: Start destination cannot be blank.");
      alert("Please enter a starting destination.");
      startInput = null;
      resetDisplay();
      resetMapAndRoute();
      return;
    }

    if (endInput === "") {
      console.error("Error: End destination cannot be blank.");
      alert("Please enter an end destination.");
      endInput = null;
      resetDisplay();
      resetMapAndRoute();
      return;
    }

    const duration = await calculateDistanceAndDuration(startInput, endInput);
    const numericDuration = parseDuration(duration);

    parseDuration(duration);
    calculateAndDisplayRoute(startInput, endInput);
    calculateDistanceAndDuration(startInput, endInput);

    const desiredArrivalInMinutes = parseTime(desiredArrivalTimeInput.value);
    let morningRoutineInMinutes = parseTime(lengthOfMorningRoutineInput.value);
    let desiredHoursOfSleepInMinutes = parseTime(
      desiredHoursOfSleepInput.value
    );
    const durationInMinutes = parseDuration(duration);

    if (desiredHoursOfSleepInMinutes > 960) {
      console.error("Error: Desired Hours of Sleep exceeds 16 hours.");
      alert("Desired Hours of Sleep cannot exceed 16 hours.");
      desiredHoursOfSleepInMinutes = null;
      resetDisplay();
      return;
    }

    if (morningRoutineInMinutes > 300) {
      console.error("Error: Morning Routine exceeds 5 hours.");
      alert("Morning routine cannot exceed 5 hours.");
      morningRoutineInMinutes = null;
      resetDisplay();
      return;
    }

    if (
      durationInMinutes ||
      durationInMinutes + morningRoutineInMinutes ||
      durationInMinutes +
        morningRoutineInMinutes +
        desiredHoursOfSleepInMinutes >
        1440
    ) {
      handleInfeasibleSchedule();
      return;
    }

    const result = calculateTimeDifference(
      desiredArrivalInMinutes,
      numericDuration,
      morningRoutineInMinutes
    );

    if (
      result.bedTimeInMinutes === null ||
      result.wakeUpTimeInMinutes === null
    ) {
      handleInfeasibleSchedule();
    } else {
      hoursOfSleep.innerText = desiredHoursOfSleepInput.value;
      arrivalTime.innerText = desiredArrivalTimeInput.value;
      bedTime.innerText = minutesToTime(result.bedTimeInMinutes);
      wakeUpTime.innerText = minutesToTime(result.wakeUpTimeInMinutes);
    }
  });
  // End of FORM.

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      form.dispatchEvent(new Event("submit"));
    }
  });

  // TEST commented-out code for troubleshooting purposes only (far distance).

  // const test = document.querySelector("#test");
  // test.addEventListener("click", (e) => {
  //   desiredHoursOfSleepInput.value = "8:00";
  //   desiredArrivalTimeInput.value = "9:00am";
  //   lengthOfMorningRoutineInput.value = "1:00";
  //   startInputElement.value = "Washington, PA";
  //   endInputElement.value = "Nebraska, USA";
  //   form.dispatchEvent(new Event("submit"));
  // });

  // TEST commented-out code for troubleshooting purposes only (close distance).

  // const test = document.querySelector("#test");
  // test.addEventListener("click", (e) => {
  //   desiredHoursOfSleepInput.value = "16:00";
  //   desiredArrivalTimeInput.value = "12:00am";
  //   lengthOfMorningRoutineInput.value = "5:00";
  //   startInputElement.value = "Washington";
  //   endInputElement.value = "Pittsburgh, PA";
  //   form.dispatchEvent(new Event("submit"));
  // });
}
