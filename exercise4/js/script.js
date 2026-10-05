// Click the image to show hotspot coordinates in percent of the image size
const image = document.querySelector('.hotspot-image img');
const coordinates = document.querySelector('#coordinates');

image.addEventListener('click', (event) => {
  const x = (event.offsetX / image.clientWidth) * 100;
  const y = (event.offsetY / image.clientHeight) * 100;
  coordinates.textContent = `--x: ${x.toFixed(1)}%; --y: ${y.toFixed(1)}%`;
});

// The selected radio button puts one experiment class on <body> (see the end of styles.css)
const options = document.querySelectorAll('input[name="experiment"]');

options.forEach((option) => {
  option.addEventListener('change', () => {
    options.forEach((other) => {
      if (other.value) {
        document.body.classList.remove(other.value);
      }
    });
    if (option.value) {
      document.body.classList.add(option.value);
    }
  });
});
