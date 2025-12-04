// IPC handlers for platform and system information
const { ipcMain } = require("electron");
const si = require("systeminformation");

ipcMain.handle("shadowquill:getPlatform", () => {
	return process.platform;
});

ipcMain.handle("shadowquill:getSystemSpecs", async () => {
	try {
		const [cpu, mem, graphics] = await Promise.all([
			si.cpu(),
			si.mem(),
			si.graphics(),
		]);

		let cpuBrand = cpu.brand;
		cpuBrand = cpuBrand
			.replace(/Gen\s+/i, "")
			.replace(/Intel\s+/i, "")
			.replace(/AMD\s+/i, "")
			.replace(/Core\s+/i, "")
			.replace(/\(R\)/g, "")
			.replace(/\(TM\)/g, "")
			.trim();

		let gpuModel = graphics.controllers[0]?.model || "Unknown GPU";
		gpuModel = gpuModel
			.replace(/NVIDIA\s+/i, "")
			.replace(/GeForce\s+/i, "")
			.replace(/AMD\s+/i, "")
			.replace(/Radeon\s+/i, "")
			.trim();

		return {
			cpu: cpuBrand,
			ram: mem.total,
			gpu: gpuModel,
		};
	} catch (e) {
		console.error("Failed to fetch system specs:", e);
		return { cpu: "Unknown", ram: 0, gpu: "Unknown" };
	}
});
