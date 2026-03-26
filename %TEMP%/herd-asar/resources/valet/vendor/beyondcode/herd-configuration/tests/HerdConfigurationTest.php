<?php

use PHPUnit\Framework\TestCase;
use BeyondCode\HerdConfiguration\HerdConfiguration;

class HerdConfigurationTest extends TestCase
{
    /**
     * @test
     */
    public function it_tries_to_detect_and_load_config_file_from_the_system()
    {
        if (getenv('CI')) {
            $this->markTestSkipped('Skipped in CI environment');
        }

        $config = HerdConfiguration::load();

        $this->assertInstanceOf(HerdConfiguration::class, $config);

        if(PHP_OS_FAMILY === 'Windows') {
            $this->assertTrue($config->isWindows());
        } else {
            $this->assertTrue($config->isMac());
        }
    }

    /**
     * @test
     */
    public function it_creates_a_config_object_from_a_valid_JSON()
    {

        $jsonString = file_get_contents(__DIR__ . '/stubs/valid-pro.json');

        $config = HerdConfiguration::fromJson($jsonString);

        $this->assertTrue($config->isMac());
        $this->assertIsBool($config->dumpsEnabled());
        $this->assertIsBool($config->mailsEnabled());
        $this->assertIsInt($config->smtpPort());

        $this->assertEquals($config->smtpPort(), 2525);
        $this->assertEquals($config->apiPort(), 2304);
        $this->assertTrue($config->mailsEnabled());
        $this->assertFalse($config->dumpsEnabled());

        $this->assertTrue($config->isPro());
    }

    /**
     * @test
     */
    public function it_detects_if_a_license_is_pro_by_config() {
        $jsonString = file_get_contents(__DIR__ . '/stubs/valid-free.json');

        $config = HerdConfiguration::fromJson($jsonString);

        $this->assertFalse($config->isPro());
    }
}
