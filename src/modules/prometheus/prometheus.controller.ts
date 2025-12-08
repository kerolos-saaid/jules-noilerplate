import { Controller, Get, Res } from "@nestjs/common";
import { PrometheusService } from "./prometheus.service";
import type { Response } from "express";

@Controller("metrics")
export class PrometheusController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    res.set("Content-Type", this.prometheusService.getRegistry().contentType);
    res.end(await this.prometheusService.getMetrics());
  }
}
