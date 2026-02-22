import { Module } from "@nestjs/common";
import { MockIntentDetector } from "./infrastructure/mock-intent-detector.service";
import { MockResponseGenerator } from "./infrastructure/mock-response-generator.service";

@Module({
  providers: [
    {
      provide: "IIntentDetector",
      useClass: MockIntentDetector,
    },
    {
      provide: "IResponseGenerator",
      useClass: MockResponseGenerator,
    },
  ],
  exports: ["IIntentDetector", "IResponseGenerator"],
})
export class CarolModule {}
