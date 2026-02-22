const fs = require("fs");

const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

const main = async () => {
  const batchSize = 100;
  const totalDocuments = 10000;
  const totalBatches = totalDocuments / batchSize;

  // Initialize the file with opening bracket
  if (!fs.existsSync("data.json") || fs.statSync("data.json").size === 0) {
    fs.writeFileSync("data.json", "[\n");
  }

  try {
    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * batchSize;
      console.log(
        `Fetching batch ${batch + 1}/${totalBatches} (offset: ${offset}, length: ${batchSize})`,
      );

      const url = new URL("https://datasets-server.huggingface.co/rows");
      url.searchParams.append("dataset", "BeIR/fiqa");
      url.searchParams.append("config", "corpus");
      url.searchParams.append("split", "corpus");
      url.searchParams.append("offset", offset.toString());
      url.searchParams.append("length", batchSize.toString());

      const data = await fetchData(url.href);

      // Open file in append mode and write new rows
      const writeStream = fs.createWriteStream("data.json", { flags: "a" });

      // If not the first batch, add comma before new data
      if (batch > 0) {
        writeStream.write(",\n");
      }

      // Write each row individually
      data.rows.forEach((row, index) => {
        writeStream.write(
          JSON.stringify({ text: row.row.text, title: row.row.title }, null, 2),
        );
        if (index < data.rows.length - 1) {
          writeStream.write(",\n");
        }
      });

      // If this is the last batch, close the array
      if (batch === totalBatches - 1) {
        writeStream.write("\n]");
      }

      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    }

    console.log(`Successfully fetched ${totalDocuments} documents`);
  } catch (error) {
    console.error("Error in main function:", error);
  }
};

main()
  .then(() => {
    console.log("Data fetching and processing completed.");
  })
  .catch((error) => {
    console.error("Error in main execution:", error);
  });
