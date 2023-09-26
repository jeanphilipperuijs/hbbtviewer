// Toggle the activation value on the current WEB page ...
var pageNotActivated = localStorage.getItem('hbbtvActive') !== 'true';
localStorage.setItem('hbbtvActive', pageNotActivated);

// Just refresh the page in order to inject new CSS and JS ...
document.location.reload();



console.log(JSON.stringify(localStorage));