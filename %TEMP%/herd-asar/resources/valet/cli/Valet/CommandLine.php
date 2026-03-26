<?php

namespace Valet;

use Symfony\Component\Process\Process;

use Laravel\Prompts\ConfirmPrompt;
use Laravel\Prompts\MultiSelectPrompt;
use Laravel\Prompts\PasswordPrompt;
use Laravel\Prompts\Prompt;
use Laravel\Prompts\SelectPrompt;
use Laravel\Prompts\SuggestPrompt;
use Laravel\Prompts\TextPrompt;
use Laravel\Prompts\TextareaPrompt;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\QuestionHelper;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;
use Symfony\Component\Console\Question\ConfirmationQuestion;
use Symfony\Component\Console\Style\SymfonyStyle;

class CommandLine
{

    /**
     * Simple global function to run commands quietly.
     */
    public function quietly(string $command): void
    {
        $this->runCommand($command.' > /dev/null 2>&1');
    }

    /**
     * Simple global function to run commands.
     */
    public function quietlyAsUser(string $command): void
    {
        $this->quietly('sudo -u "'.user().'" '.$command.' > /dev/null 2>&1');
    }

    /**
     * Pass the command to the command line and display the output.
     */
    public function passthru(string $command): void
    {
        passthru($command);
    }

    /**
     * Run the given command with PowerShell.
     *
     * @param  string  $command
     * @param  callable|null  $onError
     * @return ProcessOutput
     */
    public function powershell(string $command, ?callable $onError = null)
    {
        return $this->runCommand("powershell -command \"$command\"", $onError);
    }

    /**
     * Run the given command with PowerShell and return the output.
     *
     * @param string $command
     * @return bool
     */
    public function powershellReturns(string $command): string
    {
        $output = $this->powershell($command);

        return trim($output);
    }

    /**
     * Run the given command as the non-root user.
     */
    public function run(string $command, ?callable $onError = null): string
    {
        return $this->runCommand($command, $onError);
    }

    /**
     * Run the given command.
     */
    public function runAsUser(string $command, ?callable $onError = null): string
    {
        return $this->runCommand('sudo -u "'.user().'" '.$command, $onError);
    }

    /**
     * Run the given command and exit if fails.
     *
     * @param  string  $command
     * @param  callable  $onError  (int $code, string $output)
     * @return ProcessOutput
     */
    public function runOrExit($command, ?callable $onError = null)
    {
        return $this->run($command, function ($code, $output) use ($onError) {
            if ($onError) {
                $onError($code, $output);
            }

            exit(1);
        });
    }

    /**
     * Run the given command.
     */
    public function runCommand(string $command, ?callable $onError = null): string
    {
        $onError = $onError ?: function () {
        };

        // Symfony's 4.x Process component has deprecated passing a command string
        // to the constructor, but older versions (which Valet's Composer
        // constraints allow) don't have the fromShellCommandLine method.
        // For more information, see: https://github.com/laravel/valet/pull/761
        if (method_exists(Process::class, 'fromShellCommandline')) {
            $process = Process::fromShellCommandline($command);
        } else {
            $process = new Process($command);
        }

        $processOutput = '';
        $process->setTimeout(null)->run(function ($type, $line) use (&$processOutput) {
            $processOutput .= $line;
        });

        if ($process->getExitCode() > 0) {
            $onError($process->getExitCode(), $processOutput);
        }

        return $processOutput;
    }

    /**
     * Configure the prompt fallbacks.
     *
     * @param  \Symfony\Component\Console\Input\InputInterface  $input
     * @param  \Symfony\Component\Console\Output\OutputInterface  $output
     * @return void
     */
    public static function configurePrompts(InputInterface $input, OutputInterface $output)
    {
        Prompt::fallbackWhen(PHP_OS_FAMILY === 'Windows');

        TextPrompt::fallbackUsing(fn (TextPrompt $prompt) => self::promptUntilValid(
            fn () => (new SymfonyStyle($input, $output))->ask($prompt->label, $prompt->default ?: null) ?? '',
            $prompt->required,
            $prompt->validate,
            $output
        ));

        PasswordPrompt::fallbackUsing(fn (PasswordPrompt $prompt) => self::promptUntilValid(
            fn () => (new SymfonyStyle($input, $output))->askHidden($prompt->label) ?? '',
            $prompt->required,
            $prompt->validate,
            $output
        ));

        ConfirmPrompt::fallbackUsing(fn (ConfirmPrompt $prompt) => self::promptUntilValid(
            function () use ($prompt, $input, $output) {
                $label = $prompt->label . " " . $prompt->hint;

                $question = new ConfirmationQuestion($label, $prompt->default);

                return (new SymfonyStyle($input, $output))->askQuestion($question);
            },
            $prompt->required,
            $prompt->validate,
            $output
        ));

        SelectPrompt::fallbackUsing(fn (SelectPrompt $prompt) => self::promptUntilValid(
            fn () => (new SymfonyStyle($input, $output))->choice($prompt->label, $prompt->options, $prompt->default),
            false,
            $prompt->validate,
            $output
        ));

        MultiSelectPrompt::fallbackUsing(function (MultiSelectPrompt $prompt) use ($input, $output) {
            if ($prompt->default !== []) {

                $label = $prompt->label . " " . $prompt->hint;

                return self::promptUntilValid(
                    fn () => (new SymfonyStyle($input, $output))->choice($label, $prompt->options, implode(',', $prompt->default), true),
                    $prompt->required,
                    $prompt->validate,
                    $output
                );
            }

            return self::promptUntilValid(
                fn () => collect((new SymfonyStyle($input, $output))->choice(
                    $prompt->label,
                    array_is_list($prompt->options)
                        ? ['None', ...$prompt->options]
                        : ['none' => 'None', ...$prompt->options],
                    'None',
                    true)
                )->reject(array_is_list($prompt->options) ? 'None' : 'none')->all(),
                $prompt->required,
                $prompt->validate,
                $output
            );
        });

        SuggestPrompt::fallbackUsing(fn (SuggestPrompt $prompt) => self::promptUntilValid(
            function () use ($prompt, $input, $output) {
                $question = new Question($prompt->label, $prompt->default);

                is_callable($prompt->options)
                    ? $question->setAutocompleterCallback($prompt->options)
                    : $question->setAutocompleterValues($prompt->options);

                return (new SymfonyStyle($input, $output))->askQuestion($question);
            },
            $prompt->required,
            $prompt->validate,
            $output
        ));

        TextareaPrompt::fallbackUsing(fn (TextareaPrompt $prompt) => self::promptUntilValid(
            function () use ($prompt, $input, $output) {
                $label = $prompt->label . " " . $prompt->hint;

                $question = new Question($label);
                $question->setMultiline(true);

                $answer = (new SymfonyStyle($input, $output))->askQuestion($question);

                return $answer === null ? '' : $answer;
            },
            $prompt->required,
            $prompt->validate,
            $output
        ));



    }

    /**
     * Prompt the user until the given validation callback passes.
     *
     * @param  \Closure  $prompt
     * @param  bool|string  $required
     * @param  \Closure|null  $validate
     * @param  \Symfony\Component\Console\Output\OutputInterface  $output
     * @return mixed
     */
    public static function promptUntilValid($prompt, $required, $validate, $output)
    {
        while (true) {
            $result = $prompt();

            if ($required && ($result === '' || $result === [] || $result === false)) {
                $output->writeln('<error>'.(is_string($required) ? $required : 'Required.').'</error>');

                continue;
            }

            if ($validate) {
                $error = $validate($result);

                if (is_string($error) && strlen($error) > 0) {
                    $output->writeln("<error>{$error}</error>");

                    continue;
                }
            }

            return $result;
        }
    }
}
