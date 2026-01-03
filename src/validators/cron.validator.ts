import { ValidatorConstraint, registerDecorator } from "class-validator";
import type {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraintInterface,
} from "class-validator";
import CronExpressionParser from "cron-parser";

const getMinIntervalMinutes = (): number => {
  const envValue = process.env.SCRAPE_MIN_INTERVAL_MINUTES;
  return envValue !== undefined && envValue !== ""
    ? Number.parseInt(envValue, 10)
    : 10;
};

@ValidatorConstraint({ name: "CronMinInterval", async: false })
export class CronMinIntervalConstraint implements ValidatorConstraintInterface {
  validate(cronExpression: string): boolean {
    if (!cronExpression || cronExpression === "") {
      return false;
    }

    try {
      const interval = CronExpressionParser.parse(cronExpression);
      const first = interval.next().toDate();
      const second = interval.next().toDate();
      const diffMinutes = (second.getTime() - first.getTime()) / (1000 * 60);

      return diffMinutes >= getMinIntervalMinutes();
    } catch {
      return false;
    }
  }

  defaultMessage(arguments_: ValidationArguments): string {
    const cronExpression = arguments_.value as string;
    const minInterval = getMinIntervalMinutes();

    try {
      const interval = CronExpressionParser.parse(cronExpression);
      const first = interval.next().toDate();
      const second = interval.next().toDate();
      const diffMinutes = (second.getTime() - first.getTime()) / (1000 * 60);

      return `Cron interval must be at least ${String(minInterval)} minutes. Current interval: ${String(Math.round(diffMinutes))} minutes`;
    } catch {
      return `Invalid cron expression: ${cronExpression}`;
    }
  }
}

export const CronMinInterval =
  (options?: ValidationOptions) => (object: object, propertyName: string) => {
    registerDecorator({
      name: "CronMinInterval",
      target: object.constructor,
      propertyName,
      options,
      validator: CronMinIntervalConstraint,
    });
  };
