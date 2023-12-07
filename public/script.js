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

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 39.8097343, lng: -98.5556199 },
    zoom: 4.2,
  });

  initAutocomplete();
}

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
            throw new Error("Error: Network response was not ok.");
          }
          return response.json();
        })
        .then((data) => {
          if (
            data.status === "OK" &&
            data.rows[0].elements[0].status === "OK"
          ) {
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

    // Check if the schedule is infeasible (wake-up time being a negative value).
    if (wakeUpTimeInMinutes < 0) {
      console.error(
        "Error: Infeasible schedule due to a negative wake-up time."
      );
      return { wakeUpTimeInMinutes: null, bedTimeInMinutes: null };
    }

    // Adjust bedtime for the next day if it's negative
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

  reset.addEventListener("click", (e) => {
    resetDisplay();
    desiredHoursOfSleepInput.value = "";
    desiredArrivalTimeInput.value = "";
    lengthOfMorningRoutineInput.value = "";
    startInputElement.value = "";
    endInputElement.value = "";
    matrixMilesToDestination.innerText = 0;
    matrixDriveTime.innerText = 0;
    directionsRenderer.setDirections({ routes: [] });
    map.setCenter({ lat: 39.8097343, lng: -98.5556199 });
    map.setZoom(4.2);
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

    const startInput = startInputElement.value;
    const endInput = endInputElement.value;

    const duration = await calculateDistanceAndDuration(startInput, endInput);
    const numericDuration = parseDuration(duration);

    parseDuration(duration);
    calculateAndDisplayRoute(startInput, endInput);
    calculateDistanceAndDuration(startInput, endInput);

    const desiredArrivalInMinutes = parseTime(desiredArrivalTimeInput.value);
    const morningRoutineInMinutes =
      parseFloat(lengthOfMorningRoutineInput.value) * 60;
    const durationInMinutes = parseDuration(duration);

    if (morningRoutineInMinutes > 240) {
      console.error("Error: Morning Routine cannot exceed 5 hours.");
      alert("Morning routine cannot exceed 5 hours.");
      morningRoutineInMinutes = null;
      return;
    }

    if (
      durationInMinutes > 1440 ||
      durationInMinutes + morningRoutineInMinutes > 1440
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
  //   startInputElement.value = "Cecil, PA";
  //   endInputElement.value = "Nebraska, USA";
  //   form.dispatchEvent(new Event("submit"));
  // });

  // TEST commented-out code for troubleshooting purposes only (close distance).

  //   const test = document.querySelector("#test");
  //   test.addEventListener("click", (e) => {
  //     desiredHoursOfSleepInput.value = "8:00";
  //     desiredArrivalTimeInput.value = "9:00am";
  //     lengthOfMorningRoutineInput.value = "1:00";
  //     startInputElement.value = "Cecil, PA";
  //     endInputElement.value = "1784 Theodan Drive, PA";
  //     form.dispatchEvent(new Event("submit"));
  //   });
}
