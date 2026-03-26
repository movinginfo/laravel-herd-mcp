<?php

namespace Valet;

class HerdApiResponse
{
    public $success = false;
    public $errorMessage = '';
    public $response = [];

    public static function fromResponse($response, $key = 'status', $value = 'ok')
    {
        if(!is_array($response)) {
            return new static('error', 'Invalid response');
        }

        return new static(
            array_key_exists($key, $response) && $response[$key] === $value,
            array_key_exists('message', $response) ? $response['message'] : '',
            $response
        );
    }

    public function __construct($success, $errorMessage = '', $response = [])
    {
        $this->success = $success;
        $this->errorMessage = $errorMessage;
        $this->response = $response;
    }

    public function ok(): bool
    {
        return $this->success;
    }

    public function getErrorMessage(): string
    {
        return $this->errorMessage;
    }

    public function getResponseKey($key)
    {
        return array_key_exists($key, $this->response) ? $this->response[$key] : null;
    }
}