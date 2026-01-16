import { clientsGauge } from "./prometheus";

interface Client {
  ip: string;
  lastRequestTime: number;
}

const CLEANUP_INTERVAL = 1 * 60 * 1000; // 1 minute
const clients: Client[] = [];

const reportClient = (ip: string | undefined) => {
  if (!ip) return;
  const now = Date.now();
  const clientIndex = clients.findIndex((client) => client.ip === ip);

  if (clientIndex !== -1) {
    clients[clientIndex].lastRequestTime = now;
  } else {
    clients.push({ ip, lastRequestTime: now });
  }
};

const cleanUpOldClientsAndReport = () => {
  // Clean up
  const now = Date.now();
  clients.forEach((client, index) => {
    if (now - client.lastRequestTime > CLEANUP_INTERVAL) {
      clients.splice(index, 1);
    }
  });

  // Report
  clientsGauge.set(clients.length);
};

setInterval(cleanUpOldClientsAndReport, CLEANUP_INTERVAL);

export default reportClient;
