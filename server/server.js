const express = require("express");
const { exec, spawn } = require("child_process");
const { MongoClient } = require("mongodb"); // Added
const fs = require("fs").promises;
const app = express();
const PORT = process.env.PORT || 4000;

// MongoDB Configuration
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://fasolqa:B5jGFbrvtvKBk4aW@wpscan.dbmrnok.mongodb.net/?retryWrites=true&w=majority&appName=wpscan";
const DB_NAME = "wpscan_db";
const COLLECTION_NAME = "scan_results";

let db;

// Function to connect to MongoDB
async function connectToMongo() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log("Successfully connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit if DB connection fails
  }
}

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
    const { url, apiToken } = req.body; // callbackUrl removed

    // Walidacja wymaganych parametrów
    if (!url) {
      return res.status(400).json({
        error: "Brak wymaganego parametru: url",
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
    const token = apiToken || "2qIEeNj0pi1qpIGCAALRNJ4xXwkwAaas67GK7gjmbTo";

    if (!token) {
      console.error(
        "Błąd: Brak tokena API WPScan. Ustaw zmienną środowiskową API_WPSCAN lub przekaż apiToken w requeście."
      );
      // Send error response to client immediately, do not proceed with scan
      return res.status(400).json({
        error: "Brak tokena API WPScan. Skanowanie nie może być wykonane.",
        message:
          "Ustaw zmienną środowiskową API_WPSCAN na serwerze lub przekaż 'apiToken' w ciele żądania.",
      });
    }

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

      // Zapisz wynik w bazie danych MongoDB
      try {
        if (!db) {
          console.error("Database not initialized. Cannot save scan result.");
        } else {
          const collection = db.collection(COLLECTION_NAME);
          await collection.insertOne(scanResult);
          console.log(`Wyniki skanowania dla ${url} zapisane w MongoDB.`);
        }
      } catch (dbError) {
        console.error(
          "Błąd zapisu wyniku skanowania do MongoDB:",
          dbError.message
        );
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

      // Zapisz błąd w bazie danych MongoDB
      try {
        if (!db) {
          console.error("Database not initialized. Cannot save error result.");
        } else {
          const collection = db.collection(COLLECTION_NAME);
          await collection.insertOne(errorResult);
          console.log(`Błąd skanowania dla ${url} zapisany w MongoDB.`);
        }
      } catch (dbError) {
        console.error(
          "Błąd zapisu błędu skanowania do MongoDB:",
          dbError.message
        );
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

// Endpoint to retrieve scan results by URL
app.get("/scan-results", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: "Brak wymaganego parametru: url",
      });
    }

    if (!db) {
      return res.status(503).json({
        error: "Baza danych nie jest zainicjalizowana.",
      });
    }

    const collection = db.collection(COLLECTION_NAME);
    // Find all results for the given URL, sort by timestamp descending
    const rawResults = await collection // Renamed 'results' to 'rawResults'
      .find({ url: url })
      .sort({ timestamp: -1 })
      .toArray();

    if (rawResults.length === 0) {
      return res.status(404).json({
        message: "Nie znaleziono wyników skanowania dla podanego URL.",
        url: url,
      });
    }

    const processedResults = rawResults.map((scanDoc) => {
      const wpscanData = scanDoc.data;
      if (!wpscanData || scanDoc.status !== "completed") {
        return {
          _id: scanDoc._id, // Add the _id here
          original_timestamp: scanDoc.timestamp,
          status: scanDoc.status,
          error:
            scanDoc.error ||
            (scanDoc.status !== "completed"
              ? `Scan status: ${scanDoc.status}`
              : "WPScan data not available"),
          outdated_plugins: [],
          users: {},
          all_vulnerabilities: [],
        };
      }

      const outdated_plugins = wpscanData.plugins
        ? Object.values(wpscanData.plugins).filter(
            (plugin) => plugin.outdated === true
          )
        : [];

      const users = wpscanData.users || {};

      const all_vulnerabilities = [];
      if (wpscanData.plugins) {
        Object.values(wpscanData.plugins).forEach((plugin) => {
          if (plugin.vulnerabilities && plugin.vulnerabilities.length > 0) {
            const pluginIdentifier =
              plugin.slug ||
              plugin.name ||
              Object.keys(wpscanData.plugins).find(
                (key) => wpscanData.plugins[key] === plugin
              );
            all_vulnerabilities.push(
              ...plugin.vulnerabilities.map((v) => ({
                ...v,
                source: `plugin: ${pluginIdentifier}`,
              }))
            );
          }
        });
      }
      if (
        wpscanData.main_theme &&
        wpscanData.main_theme.vulnerabilities &&
        wpscanData.main_theme.vulnerabilities.length > 0
      ) {
        const themeIdentifier =
          wpscanData.main_theme.slug || wpscanData.main_theme.name || "main";
        all_vulnerabilities.push(
          ...wpscanData.main_theme.vulnerabilities.map((v) => ({
            ...v,
            source: `theme: ${themeIdentifier}`,
          }))
        );
      }
      if (
        wpscanData.version &&
        wpscanData.version.vulnerabilities &&
        wpscanData.version.vulnerabilities.length > 0
      ) {
        all_vulnerabilities.push(
          ...wpscanData.version.vulnerabilities.map((v) => ({
            ...v,
            source: `WordPress core: ${wpscanData.version.number}`,
          }))
        );
      }
      if (wpscanData.interesting_findings) {
        wpscanData.interesting_findings.forEach((finding) => {
          if (
            finding.type === "vulnerability" &&
            finding.vulnerabilities &&
            finding.vulnerabilities.length > 0
          ) {
            const findingIdentifier =
              finding.to_s || finding.url || "general finding";
            all_vulnerabilities.push(
              ...finding.vulnerabilities.map((v) => ({
                ...v,
                source: `finding: ${findingIdentifier}`,
              }))
            );
          }
        });
      }

      return {
        _id: scanDoc._id, // Add the _id here as well for completed scans
        original_timestamp: scanDoc.timestamp,
        status: scanDoc.status,
        target_url: wpscanData.target_url || scanDoc.url,
        effective_url: wpscanData.effective_url,
        outdated_plugins,
        users,
        all_vulnerabilities,
        wordpress_version: wpscanData.version
          ? {
              number: wpscanData.version.number,
              status: wpscanData.version.status,
              interesting_entries: wpscanData.version.interesting_entries,
              confidence: wpscanData.version.confidence,
            }
          : null,
        main_theme_info: wpscanData.main_theme
          ? {
              slug: wpscanData.main_theme.slug,
              name: wpscanData.main_theme.name,
              style_name: wpscanData.main_theme.style_name,
              location: wpscanData.main_theme.location,
              latest_version: wpscanData.main_theme.latest_version,
              outdated: wpscanData.main_theme.outdated,
              version: wpscanData.main_theme.version,
            }
          : null,
        counts: {
          outdated_plugins: outdated_plugins.length,
          users: Object.keys(users).length,
          vulnerabilities: all_vulnerabilities.length,
          plugins_found: wpscanData.plugins
            ? Object.keys(wpscanData.plugins).length
            : 0,
        },
      };
    });

    res.json({
      message: "Wyniki skanowania przetworzone pomyślnie.",
      url: url,
      count: processedResults.length,
      data: processedResults,
    });
  } catch (error) {
    console.error("Błąd pobierania wyników skanowania:", error);
    res.status(500).json({
      error: "Wewnętrzny błąd serwera podczas pobierania wyników skanowania.",
      details: error.message,
    });
  }
});

// Endpoint do sprawdzania statusu serwera
app.get("/health", (req, res) => {
  res.json({
    message: "WPScan Web Server",
    endpoints: {
      "POST /scan": "Wykonuje skanowanie WPScan",
      "GET /scan-results":
        "Pobiera wyniki skanowania z bazy danych po URL (parametr: ?url=example.com)",
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
          apiToken: "optional-custom-api-token",
        },
      },
      "scan-results": {
        method: "GET",
        url: "/scan-results?url=https://example.com",
        description: "Returns scan results for the specified URL from MongoDB.",
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
  await connectToMongo(); // Connect to MongoDB before starting the server
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
