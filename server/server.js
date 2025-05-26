const express = require("express");
const { exec, spawn } = require("child_process");
const axios = require("axios");
const fs = require("fs").promises;
const app = express();
const PORT = process.env.PORT || 4000;

// Zmienna do przechowywania nazwy kontenera
const CONTAINER_NAME = "wpscan-persistent";
let containerReady = false;

// CORS middleware to accept requests from localhost:3000
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Log incoming requests for debugging
  console.log(
    `${req.method} ${req.path} - Origin: ${req.get("Origin") || "No Origin"}`
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling preflight request");
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware do parsowania JSON
app.use(express.json());

// Funkcja do sprawdzenia czy kontener istnieje
async function checkContainer() {
  return new Promise((resolve) => {
    exec(
      `sudo docker ps -a --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`,
      (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }
        resolve(stdout.trim() === CONTAINER_NAME);
      }
    );
  });
}

// Funkcja do sprawdzenia czy kontener działa
async function isContainerRunning() {
  return new Promise((resolve) => {
    exec(
      `sudo docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`,
      (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }
        resolve(stdout.trim() === CONTAINER_NAME);
      }
    );
  });
}

// Funkcja do utworzenia i uruchomienia kontenera
async function createContainer() {
  return new Promise((resolve, reject) => {
    console.log("Tworzę długo działający kontener WPScan...");

    // Dodaj --restart=unless-stopped dla automatycznego restartu
    const command = `sudo docker run -d --name ${CONTAINER_NAME} --restart=unless-stopped --entrypoint "/bin/sh" wpscanteam/wpscan -c "while true; do sleep 1; done"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Błąd tworzenia kontenera: ${error.message}`));
        return;
      }
      console.log("Kontener WPScan utworzony i uruchomiony z auto-restart");
      containerReady = true;
      resolve(stdout.trim());
    });
  });
}

// Funkcja do usunięcia kontenera
async function removeContainer() {
  return new Promise((resolve) => {
    exec(`sudo docker rm -f ${CONTAINER_NAME}`, (error) => {
      containerReady = false;
      resolve(!error);
    });
  });
}

// Funkcja do wykonania skanowania w istniejącym kontenerze
async function executeScan(url, apiToken) {
  return new Promise(async (resolve, reject) => {
    // Najpierw sprawdź czy kontener nadal działa
    const isRunning = await isContainerRunning();

    if (!isRunning) {
      console.log("Kontener nie działa, próbuję go zrestartować...");
      try {
        await removeContainer();
        await createContainer();
        console.log("Kontener został zrestartowany");
      } catch (restartError) {
        reject({
          error: `Nie udało się zrestartować kontenera: ${restartError.message}`,
          stderr: "",
          stdout: "",
        });
        return;
      }
    }

    const scanCommand = `wpscan --url ${url} -e ap,u --format json --api-token ${apiToken} --random-user-agent`;
    const command = `sudo docker exec ${CONTAINER_NAME} ${scanCommand}`;

    exec(
      command,
      { maxBuffer: 1024 * 1024 * 10, timeout: 300000 },
      (error, stdout, stderr) => {
        if (error) {
          reject({
            error: error.message,
            stderr: stderr,
            stdout: stdout,
          });
          return;
        }
        resolve(stdout);
      }
    );
  });
}

// Inicjalizacja kontenera przy starcie serwera
async function initializeContainer() {
  try {
    const exists = await checkContainer();
    const running = await isContainerRunning();

    if (exists && !running) {
      console.log("Kontener istnieje ale nie działa, usuwam...");
      await removeContainer();
    }

    if (!exists || !running) {
      await createContainer();
    } else {
      console.log("Kontener WPScan już działa");
      containerReady = true;
    }
  } catch (error) {
    console.error("Błąd inicjalizacji kontenera:", error.message);
  }
}

// Endpoint do wykonywania skanowania WPScan
app.post("/scan", async (req, res) => {
  try {
    const { url, callbackUrl, apiToken } = req.body;

    // Walidacja wymaganych parametrów
    if (!url) {
      return res.status(400).json({
        error: "Brak wymaganego parametru: url",
      });
    }

    if (!callbackUrl) {
      return res.status(400).json({
        error: "Brak wymaganego parametru: callbackUrl",
      });
    }

    // Sprawdź czy kontener jest gotowy
    if (!containerReady) {
      return res.status(503).json({
        error: "Kontener WPScan nie jest gotowy. Spróbuj ponownie za chwilę.",
      });
    }

    console.log(`Rozpoczynam skanowanie dla: ${url}`);

    // Token API - użyj z requestu lub domyślny
    const token = apiToken || process.env.API_WPSCAN;

    // Odpowiedź natychmiastowa - skanowanie w tle
    res.json({
      message: "Skanowanie rozpoczęte",
      url: url,
      status: "processing",
      container: CONTAINER_NAME,
    });

    // Wykonanie skanowania w tle
    try {
      const stdout = await executeScan(url, token);

      let scanResult = {
        url: url,
        timestamp: new Date().toISOString(),
        status: "completed",
        container: CONTAINER_NAME,
      };

      try {
        // Parsowanie JSON z wyniku WPScan
        const wpscanData = JSON.parse(stdout);
        scanResult.data = wpscanData;
        console.log("Skanowanie zakończone pomyślnie");
      } catch (parseError) {
        console.error("Błąd parsowania JSON:", parseError);
        scanResult.status = "error";
        scanResult.error = "Błąd parsowania wyniku skanowania";
        scanResult.rawOutput = stdout;
      }

      // Wysłanie wyniku na wskazany URL
      try {
        console.log(`Wysyłam wyniki na: ${callbackUrl}`);

        const response = await axios.post(callbackUrl, scanResult, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        });

        console.log(`Wyniki wysłane pomyślnie. Status: ${response.status}`);
      } catch (sendError) {
        console.error("Błąd wysyłania wyniku:", sendError.message);
      }
    } catch (scanError) {
      console.error("Błąd skanowania:", scanError);

      let errorResult = {
        url: url,
        timestamp: new Date().toISOString(),
        status: "error",
        error: scanError.error || scanError.message,
        container: CONTAINER_NAME,
      };

      // Wyślij błąd na callback URL
      try {
        await axios.post(callbackUrl, errorResult, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        });
      } catch (sendError) {
        console.error("Błąd wysyłania błędu:", sendError.message);
      }
    }
  } catch (error) {
    console.error("Błąd serwera:", error);
    res.status(500).json({
      error: "Wewnętrzny błąd serwera",
      details: error.message,
    });
  }
});

// Endpoint do zarządzania kontenerem
app.post("/container/restart", async (req, res) => {
  try {
    console.log("Restartuję kontener WPScan...");
    await removeContainer();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Czekaj 2 sekundy
    await createContainer();
    res.json({
      message: "Kontener został zrestartowany",
      container: CONTAINER_NAME,
      status: "ready",
    });
  } catch (error) {
    res.status(500).json({
      error: "Błąd restartowania kontenera",
      details: error.message,
    });
  }
});

app.get("/container/status", async (req, res) => {
  try {
    const exists = await checkContainer();
    const running = await isContainerRunning();

    res.json({
      container: CONTAINER_NAME,
      exists: exists,
      running: running,
      ready: containerReady && running,
    });
  } catch (error) {
    res.status(500).json({
      error: "Błąd sprawdzania statusu kontenera",
      details: error.message,
    });
  }
});

app.post("/container/logs", async (req, res) => {
  try {
    exec(
      `sudo docker logs --tail 50 ${CONTAINER_NAME}`,
      (error, stdout, stderr) => {
        if (error) {
          res.status(500).json({
            error: "Błąd pobierania logów",
            details: error.message,
          });
          return;
        }
        res.json({
          container: CONTAINER_NAME,
          logs: stdout,
          errors: stderr,
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      error: "Błąd pobierania logów kontenera",
      details: error.message,
    });
  }
});

// Endpoint do zapisywania danych do pliku
app.post("/save", async (req, res) => {
  try {
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        error: "Brak danych do zapisania",
      });
    }

    // Dodaj timestamp do danych
    const dataWithTimestamp = {
      ...data,
      savedAt: new Date().toISOString(),
    };

    // Zapisz dane do pliku file.json
    await fs.writeFile(
      "file.json",
      JSON.stringify(dataWithTimestamp, null, 2),
      "utf8"
    );

    console.log("Dane zapisane do file.json");

    res.json({
      message: "Dane zostały zapisane pomyślnie",
      filename: "file.json",
      timestamp: dataWithTimestamp.savedAt,
    });
  } catch (error) {
    console.error("Błąd zapisu do pliku:", error);
    res.status(500).json({
      error: "Błąd zapisu do pliku",
      details: error.message,
    });
  }
});

// Endpoint do odczytywania danych z pliku
app.get("/get", async (req, res) => {
  try {
    // Sprawdź czy plik istnieje
    try {
      await fs.access("file.json");
    } catch {
      return res.status(404).json({
        error: "Plik file.json nie istnieje",
      });
    }

    // Odczytaj dane z pliku
    const fileContent = await fs.readFile("file.json", "utf8");
    const data = JSON.parse(fileContent);

    console.log("Dane odczytane z file.json");

    res.json({
      message: "Dane odczytane pomyślnie",
      data: data,
    });
  } catch (error) {
    console.error("Błąd odczytu pliku:", error);
    res.status(500).json({
      error: "Błąd odczytu pliku",
      details: error.message,
    });
  }
});

// Endpoint do sprawdzania statusu serwera
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "WPScan Server is running",
  });
});

// Endpoint informacyjny
app.get("/", (req, res) => {
  res.json({
    message: "WPScan Web Server",
    endpoints: {
      "POST /scan": "Wykonuje skanowanie WPScan",
      "POST /save": "Zapisuje dane do file.json",
      "GET /get": "Odczytuje dane z file.json",
      "POST /container/restart": "Restartuje kontener WPScan",
      "GET /container/status": "Sprawdza status kontenera",
      "POST /container/logs": "Pobiera logi kontenera",
      "GET /health": "Sprawdza status serwera",
    },
    usage: {
      scan: {
        method: "POST",
        url: "/scan",
        body: {
          url: "https://example.com",
          callbackUrl: "https://your-callback-url.com/results",
          apiToken: "optional-custom-api-token",
        },
      },
      save: {
        method: "POST",
        url: "/save",
        body: {
          example: "any data to save",
        },
      },
      get: {
        method: "GET",
        url: "/get",
        description: "Returns saved data from file.json",
      },
    },
  });
});

// Obsługa błędów 404
app.use((req, res, next) => {
  res.status(404).json({
    error: "Endpoint nie został znaleziony",
  });
});

// Globalna obsługa błędów
app.use((error, req, res, next) => {
  console.error("Nieobsłużony błąd:", error);
  res.status(500).json({
    error: "Wewnętrzny błąd serwera",
  });
});

// Start serwera
app.listen(PORT, async () => {
  console.log(`🚀 WPScan Server uruchomiony na porcie ${PORT}`);
  console.log(`📍 Endpoint skanowania: http://localhost:${PORT}/scan`);
  console.log(`💾 Endpoint zapisu: http://localhost:${PORT}/save`);
  console.log(`📖 Endpoint odczytu: http://localhost:${PORT}/get`);
  console.log(`🐳 Status kontenera: http://localhost:${PORT}/container/status`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);

  // Inicjalizuj kontener przy starcie
  await initializeContainer();
});

// Graceful shutdown - usuń kontener przy zamykaniu serwera
process.on("SIGINT", async () => {
  console.log("\n🛑 Zamykam serwer...");
  await removeContainer();
  console.log("🐳 Kontener WPScan usunięty");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Zamykam serwer...");
  await removeContainer();
  console.log("🐳 Kontener WPScan usunięty");
  process.exit(0);
});

module.exports = app;
