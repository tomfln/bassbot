import moment from "moment"
import chalk from "chalk"

const _log = console.log

function now() {
  return moment().format("YYYY-MM-DD HH:mm:ss")
}

function log(message: string) {
  _log(chalk.grey(`[${now()}] `) + `LOG: ${message}`)
}

function info(message: string) {
  _log(chalk.grey(`[${now()}] `) + chalk.blueBright("INFO: "), message)
}

function error(errtype: string, message: string) {
  _log(chalk.grey(`[${now()}] `) + chalk.redBright(`ERROR (${errtype}): `), message)
}

function warn(message: string) {
  _log(chalk.grey(`[${now()}] `) + chalk.yellowBright("WARN: "), message)
}

function debug(message: unknown) {
  _log(chalk.grey(`[${now()}] `) + chalk.greenBright("DEBUG: "), message)
}
function data(args: Record<any, any>) {
  _log(chalk.grey(`[${now()}] `) + chalk.greenBright("DEBUG-DATA: "))
  for (const [key, value] of Object.entries(args)) {
    process.stdout.write(chalk.magenta(`${key}: `))
    _log(value)
  }
}

export default {
  log,
  info,
  error,
  warn,
  debug,
  data,
}
