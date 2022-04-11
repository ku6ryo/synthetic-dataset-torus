async function getUserMedia() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: {
          ideal: 600,
        },
        height: {
          ideal: 500,
        }
      },
    })
  } else {
    alert("getUserMedia not supported on your browser!");
  }
}

;(async () => {
  const model = await tf.loadGraphModel("/model/model.json");

  const threshold = 0.4;
  const classesDir = {
    1: {
      name: 'Donut',
      id: 1,
    },
  }

  const mainCanvas = document.createElement("canvas");
  const ctx = mainCanvas.getContext("2d");
  document.body.appendChild(mainCanvas)
  const font = "16px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  async function predictImage(img) {
    mainCanvas.width = img.width
    mainCanvas.height = img.height
    tf.engine().startScope()
    const tfImg = tf.browser.fromPixels(img).toInt();
    const expandedImg = tfImg.transpose([0, 1, 2]).expandDims();
    const predictions = await model.executeAsync(expandedImg);
    const boxes = predictions[6].arraySync(); // shape [0, 100, 4]
    const scores = predictions[2].arraySync(); // shape [1, 100]
    const classes = predictions[4].dataSync(); // shape [1, 100]
    const detectionObjects = []
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    ctx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);

    scores[0].forEach((score, i) => {
      if (score > threshold) {
        const bbox = [];
        const minY = boxes[0][i][0] * img.height
        const minX = boxes[0][i][1] * img.width
        const maxY = boxes[0][i][2] * img.height
        const maxX = boxes[0][i][3] * img.width
        bbox[0] = minX;
        bbox[1] = minY;
        bbox[2] = maxX - minX;
        bbox[3] = maxY - minY;
        const c = classesDir[classes[i]]
        detectionObjects.push({
          class: classes[i],
          label: c ? c.name : 'Unknown',
          score: score.toFixed(4),
          bbox: bbox
        })
      }
    })
    detectionObjects.forEach(item => {
      const x = item['bbox'][0];
      const y = item['bbox'][1];
      const width = item['bbox'][2];
      const height = item['bbox'][3];

      // Draw the bounding box.
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);

      // Draw the label background.
      ctx.fillStyle = "#00FFFF";
      const textWidth = ctx.measureText(item["label"] + " " + (100 * item["score"]).toFixed(2) + "%").width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);

      ctx.fillStyle = "#000000";
      ctx.fillText(item["label"] + " " + (100*item["score"]).toFixed(2) + "%", x, y + textHeight);
    });
    tf.engine().endScope()
  }

  const imagePaths = Array(10).fill(null).map((_, i) => `/images/image71${i + 1}.png`);
  let current = 8;

  async function loadNext() {
    button.disabled = true
    if (current === imagePaths.length - 2) {
      current = 0
    } else {
      current += 1
    }
    const img = new Image();
    img.onload = async () => {
      await predictImage(img);
      button.disabled = false
    };
    img.src = imagePaths[current];
  }

  const button = document.getElementById("next")
  button.addEventListener("click", () => {
    loadNext()
  })
  loadNext()
})();
