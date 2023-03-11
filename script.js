"use strict";
// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const delete__confirmWindow = document.querySelector(".delete__confirm");
const delete__Btns = document.querySelectorAll(".delete__options-btn");
const delete__all = document.querySelector(".delete_all");

const uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

class Workout {
  date = new Date();
  id = uid();
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min / km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km / h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                   APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //get user position
    this._getPosition();
    //get date from local storage
    this._getLocalStorage();
    // attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopUp.bind(this));
    containerWorkouts.addEventListener(
      "click",
      this._deleteWorkoutFromLocalStorage.bind(this)
    );
    delete__all.addEventListener("click", this._clearLocalStorage);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        this._mapLoadError
      );
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    //map.on();
    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((el) => {
      this._renderWorkoutMarker(el);
    });
  }

  _mapLoadError() {
    alert("Could not get your position");
  }

  _showForm(mapE) {
    form.classList.remove("hidden");
    inputDistance.focus();
    this.#mapEvent = mapE;
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => {
      form.style.display = "grid";
    }, 1000);
  }
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lng, lat } = this.#mapEvent.latlng;
    let workout;
    // If workout running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers!");
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs have to be positive numbers!");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //add new object to workout array
    this.#workouts.push(workout);
    this._setLocalStorage(workout);

    //render workout on map as marker
    this._renderWorkoutMarker(workout);
    //render workout on list
    this._renderWorkout(workout);
    // Hide form + Clear input fields
    this._hideForm();
    //set local storage to workout
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
  }
  // _clearMarkers() {
  //   var markerGroup = L.layerGroup().addTo(map);
  //   markerGroup.clearLayers();
  // }
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <div class="workout__header">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__delete"><img class="trashcan" src="img/trashcan.png" /></div>
    </div>
    <div class="workout__details-container">
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === "running") {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      </div>
     </li>
  `;
    }

    if (workout.type === "cycling") {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      </div>
    </li>
  `;
    }
    const tempFormSelection = document.querySelector(".form");
    tempFormSelection.insertAdjacentHTML("afterend", html);
  }
  _moveToPopUp(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    const workout = this.#workouts.find((el) => el.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 0.5,
      },
    });

    //object coming from loc sto will lose its prototype chain
    //workout.click();
  }
  _clearLocalStorage() {
    localStorage.clear();
    location.reload();
  }
  _setLocalStorage(workout) {
    localStorage.setItem(workout.id, JSON.stringify(workout));
  }
  _getLocalStorage() {
    this.#workouts = [];
    for (const [key, value] of Object.entries(localStorage)) {
      this.#workouts.push(JSON.parse(value));
    }
    for (const workout of this.#workouts) {
      this._renderWorkout(workout);
    }
  }
  _deleteWorkoutFromLocalStorage(event) {
    const workoutEl = event.target.closest(".workout");
    if (!event.target.classList.contains("trashcan")) return;
    delete__confirmWindow.classList.remove("hidden");
    delete__Btns.forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete__yes")) {
          localStorage.removeItem(workoutEl.dataset.id);
          containerWorkouts.innerHTML = `<form class="form hidden">
         <div class="form__row">
             <label class="form__label">Type</label>
             <select class="form__input form__input--type">
               <option value="running">Running</option>
               <option value="cycling">Cycling</option>
             </select>
           </div>
           <div class="form__row">
             <label class="form__label">Distance</label>
             <input class="form__input form__input--distance" placeholder="km" />
           </div>
           <div class="form__row">
             <label class="form__label">Duration</label>
             <input
               class="form__input form__input--duration"
               placeholder="min"
             />
           </div>
           <div class="form__row">
             <label class="form__label">Cadence</label>
            <input
               class="form__input form__input--cadence"
               placeholder="step/min"
             />
           </div>
           <div class="form__row form__row--hidden">
             <label class="form__label">Elev Gain</label>
             <input
               class="form__input form__input--elevation"
              placeholder="meters"
             />
           </div>
           <button class="form__btn">OK</button>
          </form>`;
          delete__confirmWindow.classList.add("hidden");
          this._getLocalStorage();
          location.reload();
        }
        delete__confirmWindow.classList.add("hidden");
        return;
      });
    });
  }
}

const app = new App();
